import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RaidReminder, SoftReserveReminder } from "../domain/reminders.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { softReserveRepository } from "../infrastructure/postgres/softReserves.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createEvent, createGuildCharacters, createMember, createRaidWithLoot, testGuild } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import type { EventAnnouncer } from "./discordPorts.ts";
import { createRaidReminders } from "./raidReminders.ts";
import { createSignups } from "./signups.ts";

describe("raid reminders", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let reminded: RaidReminder[];
  let softReservesReminded: SoftReserveReminder[];
  let reminders: ReturnType<typeof createRaidReminders>;
  const now = new Date("2026-12-10T08:00:00Z");

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    reminded = [];
    softReservesReminded = [];
    const announcer: EventAnnouncer = {
      publish: async () => "message",
      update: async () => true,
      remind: async (reminder) => {
        reminded.push(reminder);
      },
      remindSoftReserves: async (reminder) => {
        softReservesReminded.push(reminder);
      },
      recap: async () => {},
    };
    reminders = createRaidReminders({ unitOfWork: createUnitOfWork(sql), announcer });
    await createRaidWithLoot(sql);
  });

  afterEach(async () => {
    await database.close();
  });

  it("reminds tonight's raid once, calling the signed-up members and those without soft reserves", async () => {
    const officer = await createMember(sql, "officer", "Officier");
    const tonight = await createEvent(sql, officer, new Date("2026-12-10T20:00:00Z"), ["onyxia"]);
    await createEvent(sql, officer, new Date("2026-12-17T20:00:00Z"), ["onyxia"]);
    const [deja, eole] = await createGuildCharacters(sql, "Ðéjà Vu", "Eole Hermes");
    const me = await createMember(sql, "member", "Moi");
    await characterRepository(sql).link(deja.id, me.id);
    await characterRepository(sql).link(eole.id, officer.id);
    const signups = createSignups({ unitOfWork: createUnitOfWork(sql), clock: () => now, guild: testGuild });
    await signups.signUp(me, tonight, { characterId: deja.id, role: "dps", spec: "Combat", status: "present" });
    await signups.signUp(officer, tonight, { characterId: eole.id, role: "healer", spec: "Sacré", status: "late" });
    await softReserveRepository(sql).replaceForCharacter(tonight, deja.id, [20], now);

    expect(await reminders.sendDue(now)).toBe(1);
    expect(
      reminded.map(({ event, expected, missingSoftReserves }) => [event.id, expected, missingSoftReserves]),
    ).toEqual([[tonight, ["discord-Moi", "discord-Officier"], ["discord-Officier"]]]);
    expect(await reminders.sendDue(new Date(now.getTime() + 60_000))).toBe(0);
  });

  it("calls, an hour before the raid and once, the signed-up members without soft reserves", async () => {
    const officer = await createMember(sql, "officer", "Officier");
    const tonight = await createEvent(sql, officer, new Date("2026-12-10T20:00:00Z"), ["onyxia"]);
    const [deja, eole, ciel] = await createGuildCharacters(sql, "Ðéjà Vu", "Eole Hermes", "Ciel Gris");
    const me = await createMember(sql, "member", "Moi");
    const away = await createMember(sql, "member", "Absent");
    await characterRepository(sql).link(deja.id, me.id);
    await characterRepository(sql).link(eole.id, officer.id);
    await characterRepository(sql).link(ciel.id, away.id);
    const signups = createSignups({ unitOfWork: createUnitOfWork(sql), clock: () => now, guild: testGuild });
    await signups.signUp(me, tonight, { characterId: deja.id, role: "dps", spec: "Combat", status: "present" });
    await signups.signUp(officer, tonight, { characterId: eole.id, role: "healer", spec: "Sacré", status: "late" });
    await signups.signUp(away, tonight, { characterId: ciel.id, role: "tank", spec: "Protection", status: "absent" });
    await softReserveRepository(sql).replaceForCharacter(tonight, deja.id, [20], now);

    // At 18:50, the raid starts in more than an hour; at 19:05, the lock is 25 minutes away.
    expect(await reminders.sendSoftReservesDue(new Date("2026-12-10T18:50:00Z"))).toBe(0);
    expect(await reminders.sendSoftReservesDue(new Date("2026-12-10T19:05:00Z"))).toBe(1);
    expect(softReservesReminded.map(({ event, missing }) => [event.id, missing])).toEqual([
      [tonight, ["discord-Officier"]],
    ]);
    expect(await reminders.sendSoftReservesDue(new Date("2026-12-10T19:10:00Z"))).toBe(0);
    // A night whose lock already passed is not called any more.
    await createEvent(sql, officer, new Date("2026-12-10T19:30:00Z"), ["onyxia"]);
    expect(await reminders.sendSoftReservesDue(new Date("2026-12-10T19:10:00Z"))).toBe(0);
  });
});
