import type { PGliteInterface } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DiscordRoleMapping } from "../domain/members.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import { createTestDatabase } from "../testing.ts";
import { createAuth, NotGuildMemberError, SESSION_DURATION_MS, type Auth } from "./auth.ts";

const discordRoles: DiscordRoleMapping = { member: "member-role", treasurer: "t", officer: "officer-role", gm: "g" };
const identity = { discordId: "123", discordName: "Déjà" };

describe("auth", () => {
  let database: PGliteInterface;
  let auth: Auth;
  let now: Date;

  beforeEach(async () => {
    const test = await createTestDatabase();
    database = test.database;
    now = new Date("2026-10-03T20:00:00Z");
    auth = createAuth({ unitOfWork: createUnitOfWork(test.sql), clock: () => now, discordRoles });
  });

  afterEach(async () => {
    await database.close();
  });

  it("signs in a guild member and authenticates their session", async () => {
    const signedIn = await auth.signIn(identity, ["member-role"]);
    expect(signedIn.member).toMatchObject({ discordId: "123", discordName: "Déjà", roles: ["member"] });
    expect(signedIn.expiresAt).toEqual(new Date(now.getTime() + SESSION_DURATION_MS));
    expect(await auth.authenticate(signedIn.token)).toEqual(signedIn.member);
  });

  it("refuses a Discord user without a guild role, and creates nothing", async () => {
    await expect(auth.signIn(identity, ["other"])).rejects.toBeInstanceOf(NotGuildMemberError);
    expect((await database.query("select 1 from members")).rows).toEqual([]);
  });

  it("records every guild role the member holds", async () => {
    const signedIn = await auth.signIn(identity, ["officer-role", "t", "member-role"]);
    expect(signedIn.member.roles).toEqual(["member", "treasurer", "officer"]);
  });

  it("refreshes the name and roles of a returning member", async () => {
    const first = await auth.signIn(identity, ["member-role"]);
    const second = await auth.signIn({ ...identity, discordName: "Déjà Vu" }, ["officer-role"]);
    expect(second.member).toEqual({ ...first.member, discordName: "Déjà Vu", roles: ["officer"] });
  });

  it("stores only a hash of the token", async () => {
    const { token } = await auth.signIn(identity, ["member-role"]);
    const { rows } = await database.query<{ id: string }>("select id from sessions");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).not.toContain(token);
  });

  it("rejects an expired session", async () => {
    const { token } = await auth.signIn(identity, ["member-role"]);
    now = new Date(now.getTime() + SESSION_DURATION_MS);
    expect(await auth.authenticate(token)).toBeUndefined();
  });

  it("rejects an unknown token", async () => {
    expect(await auth.authenticate("not-a-session")).toBeUndefined();
  });

  it("ends the session on sign-out", async () => {
    const { token } = await auth.signIn(identity, ["member-role"]);
    await auth.signOut(token);
    expect(await auth.authenticate(token)).toBeUndefined();
  });
});
