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
import { createCash } from "./cash.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";
import { createJournal } from "./journal.ts";
import type { AnnouncedBet, BetAnnouncer } from "./ports.ts";
import { createTreasury } from "./treasury.ts";

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

  describe("results", () => {
    let treasurer: Member;
    let thom: Member;
    let cash: ReturnType<typeof createCash>;
    let treasury: ReturnType<typeof createTreasury>;

    beforeEach(async () => {
      treasurer = await createMember(sql, "treasurer", "Trésorier");
      thom = await createMember(sql, "member", "Thom");
      const unitOfWork = createUnitOfWork(sql);
      cash = createCash({ unitOfWork, clock: () => now });
      treasury = createTreasury({ unitOfWork, clock: () => now });
    });

    /** Four stakes: 50 and 25 po on the tank, 100 on the heal, 33 on the DPS. */
    async function placeStakes(betId: string) {
      const dps = await createMember(sql, "member", "Dps");
      await bets.stake(member, betId, await choiceId(betId, "Un tank"), 50);
      await bets.stake(thom, betId, await choiceId(betId, "Un tank"), 25);
      await bets.stake(officer, betId, await choiceId(betId, "Un heal"), 100);
      await bets.stake(dps, betId, await choiceId(betId, "Un DPS"), 33);
    }

    it("settles the stakes on the winner's choice, sends the organisation's share to the cash, and journals it", async () => {
      const betId = await open(1);
      await placeStakes(betId);
      now = inHours(2);
      await bets.declareResult(officer, betId, await choiceId(betId, "Un tank"), "Le tank est tombé en premier");
      const ended = await bets.find(betId);
      expect(ended?.open).toBe(false);
      expect(ended?.bet.winningChoiceId).toBe(await choiceId(betId, "Un tank"));
      const settled = ended?.stakes.map(({ memberName, outcome, gain }) => [memberName, outcome, gain]);
      expect(settled).toHaveLength(4);
      expect(settled).toEqual(
        expect.arrayContaining([
          ["Membre", "won", 124],
          ["Thom", "won", 62],
          ["Officier", "lost", 0],
          ["Dps", "lost", 0],
        ]),
      );
      const { balance, movements } = await cash.overview();
      expect(balance).toBe(22);
      expect(movements).toMatchObject([
        { kind: "bet_share", amount: 22, label: `Pari « ${BOSS_TEN.title} » : part de l'organisation` },
      ]);
      const [entry] = await journal.listRecent();
      expect(entry).toMatchObject({
        action: "bet.result",
        reason: "Le tank est tombé en premier",
        after: { title: BOSS_TEN.title, winner: "Un tank", pool: 208, winners: 2, organisation: 22 },
      });
      await expect(bets.cancel(officer, betId, "Erreur")).rejects.toThrow(/déjà terminé/);
    });

    it("ends the bet before its closing time: no stake after", async () => {
      const betId = await open(24);
      await bets.declareResult(officer, betId, await choiceId(betId, "Un heal"), "Fin anticipée");
      await expect(bets.stake(member, betId, await choiceId(betId, "Un tank"), 10)).rejects.toThrow(/fermé/);
    });

    it("cancels a bet: every stake given back, nothing for the cash", async () => {
      const betId = await open(1);
      await placeStakes(betId);
      await bets.cancel(officer, betId, "Boss non tenté");
      const cancelled = await bets.find(betId);
      expect(cancelled?.bet.winningChoiceId).toBeUndefined();
      expect(cancelled?.stakes.every((stake) => stake.outcome === "refunded" && stake.gain === stake.amount)).toBe(
        true,
      );
      expect((await cash.overview()).movements).toEqual([]);
      expect((await journal.listRecent())[0]).toMatchObject({ action: "bet.cancel", reason: "Boss non tenté" });
    });

    it("refuses a result from a member, or on a choice of another bet", async () => {
      const betId = await open(1);
      const other = await open(1, "Autre");
      await expect(bets.declareResult(member, betId, await choiceId(betId, "Un tank"), "Motif")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      await expect(
        bets.declareResult(officer, betId, await choiceId(other, "Un tank"), "Motif"),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("turns a lost unpaid stake into a debt, which bars betting until the treasurer has it", async () => {
      const lost = await open(1);
      await bets.stake(member, lost, await choiceId(lost, "Un heal"), 40);
      await bets.declareResult(officer, lost, await choiceId(lost, "Un tank"), "Résultat");
      expect(await treasury.debtOf(member)).toBe(40);
      const next = await open(48, "Pari suivant");
      await expect(bets.stake(member, next, await choiceId(next, "Un tank"), 10)).rejects.toThrow(
        /Tu dois 40\s?po au trésorier/u,
      );
      const [debt] = (await treasury.book()).debts;
      await expect(treasury.markPaid(officer, debt?.id ?? "")).rejects.toThrow(/réservée au trésorier/);
      await treasury.markPaid(treasurer, debt?.id ?? "");
      expect(await treasury.debtOf(member)).toBe(0);
      await bets.stake(member, next, await choiceId(next, "Un tank"), 10);
    });

    it("keeps the treasurer's book: stakes received, gains handed over less unpaid stakes, all in the history", async () => {
      const betId = await open(1);
      await bets.stake(member, betId, await choiceId(betId, "Un tank"), 50);
      await bets.stake(thom, betId, await choiceId(betId, "Un heal"), 150);
      const [toPay] = (await treasury.book()).toPay.filter((stake) => stake.memberId === thom.id);
      expect(toPay).toMatchObject({ betTitle: BOSS_TEN.title, choiceLabel: "Un heal", amount: 150 });
      await treasury.markPaid(treasurer, toPay?.id ?? "");
      await expect(treasury.markPaid(treasurer, toPay?.id ?? "")).rejects.toThrow(/déjà payée/);
      await expect(bets.stake(thom, betId, await choiceId(betId, "Un tank"), 150)).rejects.toThrow(/déjà payée/);
      now = inHours(2);
      await bets.declareResult(officer, betId, await choiceId(betId, "Un tank"), "Résultat");
      const book = await treasury.book();
      // Member's 50 po on the tank bring back 180 po, less the 50 po never paid.
      expect(book.toCollect.map(({ stake, amount }) => [stake.memberName, amount])).toEqual([["Membre", 130]]);
      await treasury.markCollected(treasurer, book.toCollect[0]?.stake.id ?? "");
      await expect(treasury.markCollected(treasurer, book.toCollect[0]?.stake.id ?? "")).rejects.toThrow(/déjà versé/);
      const after = await treasury.book();
      expect(after.toCollect).toEqual([]);
      expect(
        after.history.map(({ kind, amount, treasurerName, stake }) => [kind, amount, treasurerName, stake.memberName]),
      ).toEqual([
        ["collected", 130, "Trésorier", "Membre"],
        ["paid", 150, "Trésorier", "Thom"],
      ]);
    });

    it("lets the treasurer alone record donations and expenses, with a reason, for all to see", async () => {
      await cash.record(treasurer, { kind: "donation", amount: 500, label: "Don de Thom", memberId: thom.id }, "Don");
      await cash.record(treasurer, { kind: "expense", amount: 120, label: "Flacons", memberId: undefined }, "Raid");
      await expect(
        cash.record(officer, { kind: "expense", amount: 10, label: "Flacons", memberId: undefined }, "Raid"),
      ).rejects.toThrow(/réservée au trésorier/);
      await expect(
        cash.record(treasurer, { kind: "expense", amount: 10, label: "Flacons", memberId: undefined }, " "),
      ).rejects.toThrow(/motif est obligatoire/);
      await expect(
        cash.record(treasurer, { kind: "donation", amount: 10, label: "Don", memberId: "unknown" }, "Don"),
      ).rejects.toThrow(/membre n'existe pas/);
      const overview = await cash.overview();
      expect(overview).toMatchObject({ balance: 380, entries: 500, exits: -120 });
      expect(
        overview.movements.map(({ kind, amount, memberName, recordedByName }) => [
          kind,
          amount,
          memberName,
          recordedByName,
        ]),
      ).toEqual([
        ["expense", -120, undefined, "Trésorier"],
        ["donation", 500, "Thom", "Trésorier"],
      ]);
      await expect(sql.query("delete from cash_movements")).rejects.toThrow(/append-only/);
    });
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
