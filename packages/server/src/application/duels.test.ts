import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Member } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createGuildCharacters, createMember } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createBets, type Bets } from "./bets.ts";
import { createDuels, type Duels } from "./duels.ts";
import { ForbiddenError } from "./errors.ts";
import { createJournal } from "./journal.ts";

const HOUR_MS = 60 * 60 * 1000;

describe("duels", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let duels: Duels;
  let bets: Bets;
  let journal: ReturnType<typeof createJournal>;
  let now: Date;
  let announced: string[];
  let officer: Member;
  let vorn: Member;
  let morgane: Member;
  let thessa: Member;

  const inHours = (hours: number) => new Date(now.getTime() + hours * HOUR_MS);
  const challenge = (by = vorn, opponent = morgane) =>
    duels.challenge(by, { opponentId: opponent.id, scheduledAt: inHours(24), place: " Porte d'Orgrimmar " });
  const accepted = async () => {
    const duelId = await challenge();
    await duels.answer(morgane, duelId, true);
    const betId = (await duels.find(duelId))?.duel.betId ?? "";
    return { duelId, betId };
  };
  const choiceOf = async (betId: string, label: string) =>
    (await bets.find(betId))?.bet.choices.find((choice) => choice.label === label)?.id ?? "";

  /** A member whose main is this character, as the website shows them. */
  async function memberWithMain(name: string): Promise<Member> {
    const member = await createMember(sql, "confirmed", name);
    const [main] = await createGuildCharacters(sql, name);
    await characterRepository(sql).link(main.id, member.id);
    await characterRepository(sql).setMain(member.id, main.id);
    return member;
  }

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    now = new Date("2026-12-01T12:00:00Z");
    announced = [];
    const unitOfWork = createUnitOfWork(sql);
    const clock = () => now;
    const record = async (id: string) => {
      announced.push(id);
      return true;
    };
    bets = createBets({ unitOfWork, clock });
    duels = createDuels({
      unitOfWork,
      clock,
      announcements: { announceQuietly: record },
      betAnnouncements: { announceQuietly: record },
    });
    journal = createJournal({ unitOfWork });
    officer = await createMember(sql, "officer", "Officier");
    vorn = await memberWithMain("Vorn Cendrelune");
    morgane = await memberWithMain("Morgane Nuitsombre");
    thessa = await memberWithMain("Thessa Lamevive");
  });

  afterEach(async () => {
    await database.close();
  });

  it("challenges a member at a time and a place, announced on Discord, waiting for the answer", async () => {
    const duelId = await challenge();
    const view = await duels.find(duelId);
    expect(view).toMatchObject({
      status: "proposed",
      challenger: { name: "Vorn Cendrelune" },
      opponent: { name: "Morgane Nuitsombre" },
      duel: { place: "Porte d'Orgrimmar", scheduledAt: inHours(24), betId: undefined },
    });
    expect(announced).toEqual([duelId]);
  });

  it("refuses a challenge to oneself, to a stranger, in the past", async () => {
    await expect(challenge(vorn, vorn)).rejects.toThrow(/autre joueur/);
    await expect(
      duels.challenge(vorn, {
        opponentId: "00000000-0000-0000-0000-000000000000",
        scheduledAt: inHours(1),
        place: "Ici",
      }),
    ).rejects.toThrow(/pas membre/);
    await expect(
      duels.challenge(vorn, { opponentId: morgane.id, scheduledAt: inHours(-1), place: "Ici" }),
    ).rejects.toThrow(/dans le futur/);
    expect(await duels.list()).toEqual([]);
  });

  it("opens the guild's bet when the opponent takes up the challenge, closing at the duel's time", async () => {
    const { duelId, betId } = await accepted();
    expect((await duels.find(duelId))?.status).toBe("scheduled");
    const bet = await bets.find(betId);
    expect(bet?.bet).toMatchObject({
      title: "Duel : Vorn Cendrelune contre Morgane Nuitsombre",
      closesAt: inHours(24),
    });
    expect(bet?.bet.choices.map((choice) => choice.label)).toEqual(["Vorn Cendrelune", "Morgane Nuitsombre"]);
    expect(announced).toEqual([duelId, duelId, betId]);
  });

  it("lets only the opponent answer, once, before the time; a refused duel has no bet", async () => {
    const duelId = await challenge();
    await expect(duels.answer(vorn, duelId, true)).rejects.toThrow(/joueur défié/);
    await duels.answer(morgane, duelId, false);
    expect(await duels.find(duelId)).toMatchObject({ status: "refused", duel: { betId: undefined } });
    await expect(duels.answer(morgane, duelId, true)).rejects.toThrow(/déjà sa réponse/);
    const late = await challenge();
    now = inHours(25);
    await expect(duels.answer(morgane, late, true)).rejects.toThrow(/heure du duel est passée/);
  });

  it("keeps the duelists off their duel's bet, and lets the others stake", async () => {
    const { betId } = await accepted();
    const vornWins = await choiceOf(betId, "Vorn Cendrelune");
    await expect(bets.stake(vorn, betId, vornWins, 100)).rejects.toThrow(
      "Les joueurs d'un duel ne parient pas dessus.",
    );
    await expect(bets.stake(morgane, betId, vornWins, 100)).rejects.toThrow(/ne parient pas/);
    await bets.stake(thessa, betId, vornWins, 100);
    expect((await bets.find(betId))?.stakes).toHaveLength(1);
  });

  it("records the loser's concession: the other player wins, the bet is settled, the Elo moves", async () => {
    const { duelId, betId } = await accepted();
    await bets.stake(thessa, betId, await choiceOf(betId, "Vorn Cendrelune"), 100);
    await expect(duels.concede(thessa, duelId)).rejects.toThrow(/deux joueurs/);
    await duels.concede(morgane, duelId);
    expect((await duels.find(duelId))?.duel.winnerId).toBe(vorn.id);
    const bet = await bets.find(betId);
    expect(bet?.bet.winningChoiceId).toBe(await choiceOf(betId, "Vorn Cendrelune"));
    expect(bet?.stakes[0]?.outcome).toBe("won");
    const { lines, records } = await duels.ranking();
    expect(lines).toEqual([
      { rank: 1, member: expect.objectContaining({ name: "Vorn Cendrelune" }), rating: 10, played: 1, won: 1 },
      { rank: 2, member: expect.objectContaining({ name: "Morgane Nuitsombre" }), rating: -10, played: 1, won: 0 },
    ]);
    expect(records[0]).toMatchObject({
      label: "Plus de victoires",
      value: "1 victoire",
      member: { name: "Vorn Cendrelune" },
    });
    await expect(duels.concede(vorn, duelId)).rejects.toThrow(/n'attend pas de résultat/);
  });

  it("calls a duel off at a duelist's request: the stakes come back", async () => {
    const { duelId, betId } = await accepted();
    await bets.stake(thessa, betId, await choiceOf(betId, "Morgane Nuitsombre"), 100);
    await expect(duels.cancel(thessa, duelId)).rejects.toThrow(/deux joueurs/);
    await duels.cancel(vorn, duelId);
    expect((await duels.find(duelId))?.status).toBe("cancelled");
    expect((await bets.find(betId))?.stakes[0]?.outcome).toBe("refunded");
    expect(await duels.ranking()).toEqual({ lines: [], records: [] });
  });

  it("lets an officer record a winner or call a duel off, with the reason in the journal", async () => {
    const played = await accepted();
    await expect(duels.recordAsOfficer(vorn, played.duelId, vorn.id, "Je gagne")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await duels.recordAsOfficer(officer, played.duelId, morgane.id, "Vu en jeu, le jeu ne l'a pas lu");
    const proposed = await challenge(thessa, vorn);
    await duels.cancelAsOfficer(officer, proposed, "Thessa est absente cette semaine");
    const [cancelled, result] = await journal.listRecent();
    expect(result).toMatchObject({
      action: "duel.result",
      entityId: played.duelId,
      after: { challenger: "Vorn Cendrelune", opponent: "Morgane Nuitsombre", winner: "Morgane Nuitsombre" },
    });
    expect(cancelled).toMatchObject({ action: "duel.cancel", entityId: proposed });
  });

  it("lists the duels to come soonest first, then the ended ones", async () => {
    const later = await duels.challenge(vorn, { opponentId: thessa.id, scheduledAt: inHours(48), place: "Ici" });
    const { duelId: sooner } = await accepted();
    const refused = await duels.challenge(thessa, { opponentId: morgane.id, scheduledAt: inHours(12), place: "Là" });
    await duels.answer(morgane, refused, false);
    expect((await duels.list()).map((view) => view.duel.id)).toEqual([sooner, later, refused]);
  });
});
