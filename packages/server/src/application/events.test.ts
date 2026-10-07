import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EVENT_LISTED_AFTER_START_MS, type NewRaidEvent } from "../domain/events.ts";
import type { Member } from "../domain/members.ts";
import { createFakeDiscord, type FakeDiscord } from "../infrastructure/discord/fakeDiscord.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createMember, createRaids, TEST_GUILD_ID, testGuild } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";
import { createEvents } from "./events.ts";
import { createJournal } from "./journal.ts";

const HOUR = 60 * 60 * 1000;

describe("events", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let events: ReturnType<typeof createEvents>;
  let journal: ReturnType<typeof createJournal>;
  let officer: Member;
  let now: Date;
  let discord: FakeDiscord;
  let raiders: string;

  const event = (hoursFromNow: number, overrides: Partial<NewRaidEvent> = {}): NewRaidEvent => ({
    startsAt: new Date(now.getTime() + hoursFromNow * HOUR),
    raidIds: ["onyxia"],
    softReservesPerPlayer: 1,
    roleId: TEST_GUILD_ID,
    ...overrides,
  });

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    discord = createFakeDiscord();
    vi.stubGlobal("fetch", discord.fetch);
    raiders = discord.addRole("Raideur R1");
    now = new Date("2026-12-01T12:00:00Z");
    const unitOfWork = createUnitOfWork(sql);
    events = createEvents({ unitOfWork, clock: () => now, guild: testGuild });
    journal = createJournal({ unitOfWork });
    officer = await createMember(sql, "officer", "Officier");
    await createRaids(sql, { onyxia: "Onyxia", "mont-hyjal": "Mont Hyjal" });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await database.close();
  });

  it("lists the raids by name", async () => {
    expect(await events.listRaids()).toEqual([
      { id: "mont-hyjal", name: "Mont Hyjal" },
      { id: "onyxia", name: "Onyxia" },
    ]);
  });

  it("offers everybody and the server's roles, except those Discord and VXV give", async () => {
    discord.addRole("VXV", true);
    discord.addRole("Démoniste");
    expect(await events.listRoleChoices()).toEqual([
      { id: TEST_GUILD_ID, name: "Tout le monde", everyone: true },
      { id: raiders, name: "Raideur R1", everyone: false },
    ]);
  });

  it("creates an event on several raids, reserved to a role, and records it in the journal", async () => {
    const created = event(48, { raidIds: ["onyxia", "mont-hyjal"], softReservesPerPlayer: 2, roleId: raiders });
    const eventId = await events.createEvent(officer, created, "Raid de la semaine");
    expect(await events.getEvent(eventId)).toEqual({
      id: eventId,
      startsAt: created.startsAt,
      softReservesPerPlayer: 2,
      raids: [
        { id: "mont-hyjal", name: "Mont Hyjal" },
        { id: "onyxia", name: "Onyxia" },
      ],
      role: { id: raiders, name: "Raideur R1" },
    });
    expect(await journal.listRecent()).toEqual([
      expect.objectContaining({
        action: "event.create",
        entityId: eventId,
        reason: "Raid de la semaine",
        after: {
          startsAt: created.startsAt.toISOString(),
          raids: ["Mont Hyjal", "Onyxia"],
          softReservesPerPlayer: 2,
          audience: "Réservé à Raideur R1",
        },
      }),
    ]);
  });

  it("opens an event to everybody with @everyone", async () => {
    const eventId = await events.createEvent(officer, event(48), "Raid reroll");
    expect((await events.getEvent(eventId))?.role).toBeUndefined();
    expect(await journal.listRecent()).toEqual([
      expect.objectContaining({ after: expect.objectContaining({ audience: "Ouvert à tous" }) }),
    ]);
  });

  it("refuses an event reserved to a role not offered", async () => {
    const classRole = discord.addRole("Démoniste");
    await expect(events.createEvent(officer, event(48, { roleId: classRole }), "Motif")).rejects.toThrow(
      /qui peut s'inscrire/,
    );
    await expect(events.createEvent(officer, event(48, { roleId: "" }), "Motif")).rejects.toThrow(
      /qui peut s'inscrire/,
    );
    expect(await events.listUpcoming()).toEqual([]);
  });

  it("refuses an event to a member and an invalid event to an officer", async () => {
    const member = await createMember(sql, "member");
    await expect(events.createEvent(member, event(48), "Motif")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(events.createEvent(officer, event(-1), "Motif")).rejects.toBeInstanceOf(ValidationError);
    await expect(events.createEvent(officer, event(48, { raidIds: ["naxxramas"] }), "Motif")).rejects.toThrow(
      /n'existe pas/,
    );
    expect(await events.listUpcoming()).toEqual([]);
    expect(await journal.listRecent()).toEqual([]);
  });

  it("lists upcoming events soonest first, keeping those started a few hours ago", async () => {
    const later = await events.createEvent(officer, event(72), "Plus tard");
    const sooner = await events.createEvent(officer, event(24), "Bientôt");
    now = new Date(now.getTime() + 24 * HOUR + EVENT_LISTED_AFTER_START_MS - HOUR);
    expect((await events.listUpcoming()).map((listed) => listed.id)).toEqual([sooner, later]);
    now = new Date(now.getTime() + 2 * HOUR);
    expect((await events.listUpcoming()).map((listed) => listed.id)).toEqual([later]);
  });

  it("finds no event for an unknown or malformed id", async () => {
    expect(await events.getEvent("00000000-0000-0000-0000-000000000000")).toBeUndefined();
    expect(await events.getEvent("not-an-id")).toBeUndefined();
  });
});
