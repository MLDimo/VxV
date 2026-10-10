import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Member } from "../domain/members.ts";
import { TextFormatError } from "../domain/textFormat.ts";
import type { RaidRecap } from "../domain/raidRecap.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createEvent, createGuildCharacters, createMember, createRaidWithLoot } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";
import { createHistory } from "./history.ts";
import { createJournal } from "./journal.ts";
import type { EventAnnouncer } from "./discordPorts.ts";
import { COMPANION_LOG_REASON, createRaidLogs } from "./raidLogs.ts";

const NOW = new Date("2026-12-11T09:00:00Z");

function logOf(eventId: string, ...extra: string[]): string {
  return [
    "VXV-LOG-2",
    `R;${eventId};1796936400;1796940720`,
    "K;2;1796940600",
    "P;Ðéjà Vu",
    "P;Thom Leboss",
    "L;2;20;Thom Leboss;soft_reserve_plus;1796940660",
    "L;2;21;Ðéjà Vu;loot_council;1796940670",
    "L;1;99;Thom Leboss;free_roll;1796940680",
    "D;Thom Leboss;2",
    ...extra,
  ].join("\n");
}

describe("raid logs", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let raidLogs: ReturnType<typeof createRaidLogs>;
  let history: ReturnType<typeof createHistory>;
  let journal: ReturnType<typeof createJournal>;
  let officer: Member;
  let eventId: string;
  let recaps: RaidRecap[];
  let discordDown: boolean;

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    const unitOfWork = createUnitOfWork(sql);
    recaps = [];
    discordDown = false;
    const announcer: EventAnnouncer = {
      publish: async () => "message",
      update: async () => true,
      remind: async () => {},
      remindSoftReserves: async () => {},
      recap: async (recap) => {
        if (discordDown) {
          throw new Error("Discord is down");
        }
        recaps.push(recap);
      },
    };
    raidLogs = createRaidLogs({ unitOfWork, announcer, clock: () => NOW });
    history = createHistory({ unitOfWork });
    journal = createJournal({ unitOfWork });
    officer = await createMember(sql, "officer", "Officier");
    await createGuildCharacters(sql, "Ðéjà Vu", "Thom Leboss");
    await createRaidWithLoot(sql);
    eventId = await createEvent(sql, officer, new Date("2026-12-10T20:00:00Z"), ["onyxia"]);
  });

  afterEach(async () => {
    await database.close();
  });

  it("adds the players present and the items given, journals the council's gives and publishes the recap", async () => {
    const summary = await raidLogs.importLog(officer, eventId, logOf(eventId, "P;Inconnu Total"), "Raid du jeudi");
    expect(summary).toEqual({ kills: 1, present: 2, loots: 2, unknownCharacters: ["Inconnu Total"], unknownLoots: 1 });

    const loots = await history.listLoots({ softReserveOnly: false });
    expect(loots.map((loot) => [loot.itemName, loot.winnerName, loot.method])).toEqual([
      ["Sac en peau", "Ðéjà Vu", "loot_council"],
      ["Tête d'Onyxia", "Thom Leboss", "soft_reserve_plus"],
    ]);
    const attendance = await sql.query<{ count: number }>(
      "select count(*)::int as count from event_attendance where event_id = $1",
      [eventId],
    );
    expect(attendance[0]?.count).toBe(2);

    const entries = await journal.listRecent();
    expect(entries.map((entry) => [entry.action, entry.reason])).toEqual([
      ["loot.council", "Raid du jeudi"],
      ["raid.import", "Raid du jeudi"],
    ]);
    expect(recaps).toHaveLength(1);
    expect(recaps[0]).toMatchObject({
      kills: ["Onyxia"],
      durationMs: 72 * 60 * 1000,
      deaths: [{ name: "Thom Leboss", count: 2 }],
    });
  });

  it("adds only what is new at the next import, keeps a correction, and publishes the recap once", async () => {
    await raidLogs.importLog(officer, eventId, logOf(eventId), "Raid du jeudi");
    await sql.query("update loots set method = 'free_roll' where item_id = 20");
    const again = await raidLogs.importLog(
      officer,
      eventId,
      logOf(eventId, "L;2;10;Thom Leboss;free_roll;1796940690"),
      "Objet oublié",
    );
    expect(again.loots).toBe(1);
    const loots = await history.listLoots({ softReserveOnly: false });
    expect(loots.find((loot) => loot.itemName === "Tête d'Onyxia")?.method).toBe("free_roll");
    expect(recaps).toHaveLength(1);
  });

  it("imports even when Discord is down, and publishes the recap at the next import", async () => {
    discordDown = true;
    await raidLogs.importLog(officer, eventId, logOf(eventId), "Raid du jeudi");
    expect(recaps).toHaveLength(0);
    discordDown = false;
    await raidLogs.importLog(officer, eventId, logOf(eventId), "Nouvel essai");
    expect(recaps).toHaveLength(1);
  });

  it("refuses a member, a log of another event and a damaged log", async () => {
    const member = await createMember(sql, "member", "Membre");
    await expect(raidLogs.importLog(member, eventId, logOf(eventId), "Essai")).rejects.toThrow(ForbiddenError);
    await expect(raidLogs.importLog(officer, eventId, logOf("autre"), "Essai")).rejects.toThrow(ValidationError);
    await expect(raidLogs.importLog(officer, eventId, "VXV-LOG-2\nK;x;y", "Essai")).rejects.toThrow(TextFormatError);
  });

  describe("from the officers' companions", () => {
    it("adds the raid's records, journals only what is new, and keeps the recap for the end", async () => {
      const first = await raidLogs.receiveFromCompanion(officer, logOf(eventId));
      expect(first).toEqual({ summary: expect.objectContaining({ present: 2, loots: 2 }), news: 4 });
      const other = await createMember(sql, "gm", "Maître");
      expect((await raidLogs.receiveFromCompanion(other, logOf(eventId))).news).toBe(0);
      const entries = await journal.listRecent();
      expect(entries.map((entry) => [entry.action, entry.reason])).toEqual([
        ["loot.council", COMPANION_LOG_REASON],
        ["raid.import", COMPANION_LOG_REASON],
      ]);
      expect(recaps).toHaveLength(0);
    });

    it("publishes the recap once the raid is over, from the most complete log, once", async () => {
      await raidLogs.receiveFromCompanion(officer, logOf(eventId, "D;Ðéjà Vu;1"));
      await raidLogs.receiveFromCompanion(officer, logOf(eventId));
      const tonight = await createEvent(sql, officer, new Date(NOW.getTime() - 60 * 60 * 1000), ["onyxia"]);
      await raidLogs.receiveFromCompanion(officer, logOf(tonight));
      expect(await raidLogs.publishDueRecaps()).toBe(1);
      expect(recaps).toEqual([
        expect.objectContaining({
          event: expect.objectContaining({ id: eventId }),
          deaths: [
            { name: "Thom Leboss", count: 2 },
            { name: "Ðéjà Vu", count: 1 },
          ],
        }),
      ]);
      expect(await raidLogs.publishDueRecaps()).toBe(0);
    });

    it("is reserved to the officers, for an event the website knows", async () => {
      const member = await createMember(sql, "member", "Membre");
      await expect(raidLogs.receiveFromCompanion(member, logOf(eventId))).rejects.toThrow(ForbiddenError);
      await expect(
        raidLogs.receiveFromCompanion(officer, logOf("00000000-0000-0000-0000-000000000000")),
      ).rejects.toThrow(ValidationError);
    });
  });
});
