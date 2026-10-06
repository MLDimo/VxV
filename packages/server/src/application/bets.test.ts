import type { PGliteInterface } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DiscordMessage } from "../domain/bets.ts";
import type { Member } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createGuildCharacters, createMember } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createBetAnnouncements } from "./betAnnouncements.ts";
import { createBets, type Bets } from "./bets.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";
import { createJournal } from "./journal.ts";
import type { AnnouncedBet, BetAnnouncer } from "./ports.ts";

const HOUR_MS = 60 * 60 * 1000;
const BOSS_TEN = { title: "Qui meurt en premier sur le boss 10 ?", choices: ["Un tank", " Un heal ", "", "Un DPS"] };

describe("bets", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let bets: Bets;
  let journal: ReturnType<typeof createJournal>;
  let now: Date;
  let officer: Member;
  let member: Member;

  const inHours = (hours: number) => new Date(now.getTime() + hours * HOUR_MS);
  const open = (closesInHours = 24, title = BOSS_TEN.title) =>
    bets.create(officer, { ...BOSS_TEN, title, closesAt: inHours(closesInHours) }, "Pour le raid de jeudi");
  const choiceId = async (betId: string, label: string) =>
    (await bets.find(betId))?.bet.choices.find((choice) => choice.label === label)?.id ?? "";

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    now = new Date("2026-10-06T20:00:00Z");
    const unitOfWork = createUnitOfWork(sql);
    bets = createBets({ unitOfWork, clock: () => now });
    journal = createJournal({ unitOfWork });
    officer = await createMember(sql, "officer", "Officier");
    member = await createMember(sql, "member", "Membre");
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await database.close();
  });

  it("lets an officer open a bet with its choices, recorded in the journal with the reason", async () => {
    const betId = await open();
    const found = await bets.find(betId);
    expect(found?.bet.title).toBe(BOSS_TEN.title);
    expect(found?.bet.choices.map((choice) => choice.label)).toEqual(["Un tank", "Un heal", "Un DPS"]);
    expect(found?.open).toBe(true);
    const [entry] = await journal.listRecent();
    expect(entry).toMatchObject({
      action: "bet.create",
      entityId: betId,
      reason: "Pour le raid de jeudi",
      after: { title: BOSS_TEN.title, choices: ["Un tank", "Un heal", "Un DPS"], closesAt: inHours(24).toISOString() },
    });
  });

  it("refuses a bet opened by a member, without reason, or with a single choice", async () => {
    const bet = { ...BOSS_TEN, closesAt: inHours(24) };
    await expect(bets.create(member, bet, "Motif")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(bets.create(officer, bet, " ")).rejects.toBeInstanceOf(ValidationError);
    await expect(bets.create(officer, { ...bet, choices: ["Oui", " "] }, "Motif")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("lists the open bets closing soonest first, then the closed ones, latest first", async () => {
    await open(48, "Ferme à +48 h");
    await open(2, "Ferme à +2 h");
    await open(1, "Ferme à +1 h");
    await open(3, "Ferme à +3 h");
    now = inHours(4);
    await open(1, "Ferme à +5 h");
    expect((await bets.list()).map(({ bet, open: isOpen }) => [bet.title, isOpen])).toEqual([
      ["Ferme à +5 h", true],
      ["Ferme à +48 h", true],
      ["Ferme à +3 h", false],
      ["Ferme à +2 h", false],
      ["Ferme à +1 h", false],
    ]);
  });

  it("takes a member's stake, shown by their main character, and moves it to another choice or amount", async () => {
    const [deja] = await createGuildCharacters(sql, "Ðéjà Vu");
    await characterRepository(sql).link(deja.id, member.id);
    await characterRepository(sql).setMain(member.id, deja.id);
    const betId = await open();
    const tank = await choiceId(betId, "Un tank");
    const heal = await choiceId(betId, "Un heal");
    await bets.stake(officer, betId, heal, 150);
    const placed = await bets.stake(member, betId, tank, 50);
    expect(placed.book.pool).toBe(200);
    expect(placed.stakes.find((stake) => stake.memberId === member.id)).toMatchObject({
      memberName: "Ðéjà Vu",
      memberClass: "ROGUE",
      choiceId: tank,
      amount: 50,
    });
    expect(placed.stakes.find((stake) => stake.memberId === officer.id)?.memberName).toBe("Officier");
    const moved = await bets.stake(member, betId, heal, 30);
    expect(moved.stakes.filter((stake) => stake.memberId === member.id)).toMatchObject([
      { choiceId: heal, amount: 30 },
    ]);
    expect(moved.book.pool).toBe(180);
  });

  it("refuses stakes once the bet closes, and on a choice of another bet", async () => {
    const betId = await open(1);
    const other = await open(1, "Autre pari");
    await expect(bets.stake(member, betId, await choiceId(other, "Un tank"), 10)).rejects.toThrow(/choix du pari/);
    await expect(bets.stake(member, "unknown", await choiceId(betId, "Un tank"), 10)).rejects.toThrow(/n'existe pas/);
    now = inHours(1);
    await expect(bets.stake(member, betId, await choiceId(betId, "Un tank"), 10)).rejects.toThrow(/fermé/);
  });

  it("lets a member take their stake back until it is paid", async () => {
    const betId = await open();
    const tank = await choiceId(betId, "Un tank");
    await bets.stake(member, betId, tank, 10);
    expect((await bets.withdraw(member, betId)).stakes).toEqual([]);
    await expect(bets.withdraw(member, betId)).rejects.toThrow(/pas de mise/);
    await bets.stake(member, betId, tank, 10);
    await sql.query("update stakes set paid_at = $1, paid_by = $2", [now, officer.id]);
    await expect(bets.withdraw(member, betId)).rejects.toThrow(/déjà payée/);
    await expect(bets.stake(member, betId, tank, 20)).rejects.toThrow(/déjà payée/);
  });

  describe("on Discord", () => {
    let published: AnnouncedBet[];
    let updated: AnnouncedBet[];
    let deleted: boolean;

    const MESSAGE: DiscordMessage = { channelId: "bets", messageId: "message-1" };
    const announcer: BetAnnouncer = {
      publish(bet) {
        published.push(bet);
        return Promise.resolve(MESSAGE);
      },
      update(_message, bet) {
        updated.push(bet);
        return Promise.resolve(!deleted);
      },
    };

    beforeEach(() => {
      published = [];
      updated = [];
      deleted = false;
    });

    it("publishes the bet's message once, then updates it, and again if it was deleted", async () => {
      const announcements = createBetAnnouncements({ unitOfWork: createUnitOfWork(sql), announcer, clock: () => now });
      const betId = await open();
      await announcements.announce(betId);
      expect(published.map(({ bet, open: isOpen }) => [bet.title, isOpen])).toEqual([[BOSS_TEN.title, true]]);
      expect((await bets.find(betId))?.bet.discordMessage).toEqual(MESSAGE);
      await bets.stake(member, betId, await choiceId(betId, "Un tank"), 10);
      await announcements.announce(betId);
      expect(updated.map(({ stakes }) => stakes.length)).toEqual([1]);
      deleted = true;
      await announcements.announce(betId);
      expect(published).toHaveLength(2);
    });

    it("never fails a stake because Discord is out of reach", async () => {
      const failing: BetAnnouncer = { publish: () => Promise.reject(new Error("offline")), update: announcer.update };
      const announcements = createBetAnnouncements({
        unitOfWork: createUnitOfWork(sql),
        announcer: failing,
        clock: () => now,
      });
      const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
      expect(await announcements.announceQuietly(await open())).toBe(false);
      expect(errors).toHaveBeenCalledOnce();
    });
  });
});
