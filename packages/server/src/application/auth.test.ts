import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DiscordRoleMapping } from "../domain/members.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import { createTestDatabase } from "../testing.ts";
import { createAuth, SESSION_DURATION_MS, type Auth } from "./auth.ts";

const discordRoles: DiscordRoleMapping = { treasurer: "t", officer: "officer-role", gm: "g" };
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
    const signedIn = await auth.signIn(identity, []);
    expect(signedIn.member).toMatchObject({ discordId: "123", discordName: "Déjà", roles: ["member"] });
    expect(signedIn.expiresAt).toEqual(new Date(now.getTime() + SESSION_DURATION_MS));
    expect(await auth.authenticate(signedIn.token)).toEqual(signedIn.member);
  });

  it("records every guild role the member holds", async () => {
    const signedIn = await auth.signIn(identity, ["officer-role", "t"]);
    expect(signedIn.member.roles).toEqual(["member", "treasurer", "officer"]);
  });

  it("identifies a member acting through the bot as the same member, without a session", async () => {
    const signedIn = await auth.signIn(identity, []);
    const identified = await auth.identify({ ...identity, discordName: "Déjà Vu" }, ["officer-role"]);
    expect(identified).toEqual({ ...signedIn.member, discordName: "Déjà Vu", roles: ["member", "officer"] });
    expect((await database.query("select 1 from sessions")).rows).toHaveLength(1);
  });

  it("refreshes the name and roles of a returning member", async () => {
    const first = await auth.signIn(identity, []);
    const second = await auth.signIn({ ...identity, discordName: "Déjà Vu" }, ["officer-role"]);
    expect(second.member).toEqual({ ...first.member, discordName: "Déjà Vu", roles: ["member", "officer"] });
  });

  it("stores only a hash of the token", async () => {
    const { token } = await auth.signIn(identity, []);
    const { rows } = await database.query<{ id: string }>("select id from sessions");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).not.toContain(token);
  });

  it("rejects an expired session", async () => {
    const { token } = await auth.signIn(identity, []);
    now = new Date(now.getTime() + SESSION_DURATION_MS);
    expect(await auth.authenticate(token)).toBeUndefined();
  });

  it("rejects an unknown token", async () => {
    expect(await auth.authenticate("not-a-session")).toBeUndefined();
  });

  it("ends the session on sign-out", async () => {
    const { token } = await auth.signIn(identity, []);
    await auth.signOut(token);
    expect(await auth.authenticate(token)).toBeUndefined();
  });
});
