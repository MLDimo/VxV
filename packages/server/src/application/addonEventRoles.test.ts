import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Member } from "../domain/members.ts";
import { createFakeDiscord } from "../infrastructure/discord/fakeDiscord.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import { createMember, testGuild } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createAddonEventRoles } from "./addonEventRoles.ts";
import { createEvents } from "./events.ts";

describe("roles an event may be reserved to, for the addon", () => {
  let database: PGliteInterface;
  let addonEventRoles: ReturnType<typeof createAddonEventRoles>;
  let officer: Member;
  let member: Member;

  beforeEach(async () => {
    const created = await createTestDatabase();
    database = created.database;
    const { sql } = created;
    const discord = createFakeDiscord();
    vi.stubGlobal("fetch", discord.fetch);
    discord.addRole("Raideur R1");
    const unitOfWork = createUnitOfWork(sql);
    const clock = () => new Date("2026-12-01T12:00:00Z");
    addonEventRoles = createAddonEventRoles({
      unitOfWork,
      clock,
      events: createEvents({ unitOfWork, clock, guild: testGuild }),
    });
    officer = await createMember(sql, "officer", "Officier");
    member = await createMember(sql, "member", "Membre");
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await database.close();
  });

  it("gives an officer's companion the roles offered, everybody first", async () => {
    const text = await addonEventRoles.exportEventRoles(officer);
    expect(text?.split("\n")).toEqual(["VXV-ROLES-1", "P;1796126400", "R;guild;Tout le monde", "R;1;Raideur R1"]);
  });

  it("gives nothing to another member, nor while Discord does not answer", async () => {
    expect(await addonEventRoles.exportEventRoles(member)).toBeUndefined();
    vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await addonEventRoles.exportEventRoles(officer)).toBeUndefined();
  });
});
