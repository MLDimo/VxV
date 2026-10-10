import { createHash, randomBytes } from "node:crypto";
import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DiscordRoleMapping, Member } from "../domain/members.ts";
import { createFakeDiscord, type FakeDiscord } from "../infrastructure/discord/fakeDiscord.ts";
import { createDiscordGuild } from "../infrastructure/discord/guild.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import { createMember } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import {
  COMPANION_CODE_DURATION_MS,
  COMPANION_ROLES_CHECK_MS,
  COMPANION_TOKEN_DURATION_MS,
  createCompanion,
  type Companion,
} from "./companion.ts";
import { ValidationError } from "./errors.ts";

const discordRoles: DiscordRoleMapping = { confirmed: "c", treasurer: "t", officer: "officer-role", gm: "g" };

/** What the companion keeps secret, and what it sends first. */
function pkce() {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

describe("companion", () => {
  let database: PGliteInterface;
  let discord: FakeDiscord;
  let companion: Companion;
  let now: Date;
  let officer: Member;

  const later = (milliseconds: number) => {
    now = new Date(now.getTime() + milliseconds);
  };

  async function link(member: Member) {
    const { verifier, challenge } = pkce();
    const code = await companion.startLink(member, challenge);
    return companion.finishLink(code, verifier);
  }

  beforeEach(async () => {
    const test = await createTestDatabase();
    database = test.database;
    discord = createFakeDiscord();
    vi.stubGlobal("fetch", discord.fetch);
    now = new Date("2026-10-06T20:00:00Z");
    companion = createCompanion({
      unitOfWork: createUnitOfWork(test.sql),
      clock: () => now,
      discordRoles,
      guild: createDiscordGuild({ token: "token", guildId: "guild" }),
    });
    officer = await createMember(test.sql, "officer", "Deja");
    discord.handle("PUT", `/guilds/guild/members/${officer.discordId}/roles/officer-role`, undefined);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await database.close();
  });

  it("links the companion that proves it started the link, and authenticates its token", async () => {
    const { token, member } = await link(officer);
    expect(member).toEqual(officer);
    expect(await companion.authenticate(token)).toEqual(officer);
  });

  it("stores only hashes of the codes and tokens", async () => {
    const { verifier, challenge } = pkce();
    const code = await companion.startLink(officer, challenge);
    const codes = await database.query<{ id: string }>("select id from companion_codes");
    expect(codes.rows[0]?.id).not.toBe(code);
    const { token } = await companion.finishLink(code, verifier);
    const tokens = await database.query<{ id: string }>("select id from companion_tokens");
    expect(tokens.rows[0]?.id).not.toBe(token);
  });

  it("refuses a malformed challenge", async () => {
    await expect(companion.startLink(officer, "short")).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses a code without the companion's verifier, then forgets it", async () => {
    const { verifier, challenge } = pkce();
    const code = await companion.startLink(officer, challenge);
    await expect(companion.finishLink(code, pkce().verifier)).rejects.toBeInstanceOf(ValidationError);
    await expect(companion.finishLink(code, verifier)).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses a code used twice or too late", async () => {
    const { verifier, challenge } = pkce();
    const code = await companion.startLink(officer, challenge);
    await companion.finishLink(code, verifier);
    await expect(companion.finishLink(code, verifier)).rejects.toBeInstanceOf(ValidationError);
    const late = pkce();
    const lateCode = await companion.startLink(officer, late.challenge);
    later(COMPANION_CODE_DURATION_MS);
    await expect(companion.finishLink(lateCode, late.verifier)).rejects.toBeInstanceOf(ValidationError);
  });

  it("reads the roles again from Discord once they are old, and keeps the token alive", async () => {
    const { token } = await link(officer);
    discord.handle("DELETE", `/guilds/guild/members/${officer.discordId}/roles/officer-role`, undefined);
    later(COMPANION_ROLES_CHECK_MS - 1);
    expect((await companion.authenticate(token))?.roles).toEqual(officer.roles);
    later(1);
    expect((await companion.authenticate(token))?.roles).toEqual(["member"]);
    later(COMPANION_TOKEN_DURATION_MS - 1);
    expect(await companion.authenticate(token)).toBeDefined();
  });

  it("keeps the known roles while Discord is out of reach", async () => {
    const { token } = await link(officer);
    later(COMPANION_ROLES_CHECK_MS);
    vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await companion.authenticate(token))?.roles).toEqual(officer.roles);
  });

  it("ends the token of a member who left the guild's Discord server", async () => {
    const { token } = await link(officer);
    discord.leave(officer.discordId);
    later(COMPANION_ROLES_CHECK_MS);
    expect(await companion.authenticate(token)).toBeUndefined();
    expect((await database.query("select 1 from companion_tokens")).rows).toHaveLength(0);
  });

  it("refuses a token left unused too long, or unlinked", async () => {
    const first = await link(officer);
    later(COMPANION_TOKEN_DURATION_MS);
    expect(await companion.authenticate(first.token)).toBeUndefined();
    const second = await link(officer);
    await companion.unlink(second.token);
    expect(await companion.authenticate(second.token)).toBeUndefined();
  });
});
