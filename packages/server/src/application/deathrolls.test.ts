import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEATHROLL_HEADER } from "../domain/deathrolls.ts";
import type { Member } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createGuildCharacters, createMember } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createAddonGames } from "./addonGames.ts";
import { createBets } from "./bets.ts";
import { createDeathrolls } from "./deathrolls.ts";
import type { AnnouncedDeathroll } from "./discordPorts.ts";
import { createTreasury } from "./treasury.ts";

const ACCEPTED = 1796904000;
/** Thom challenges Vorn for the stake; Vorn rolls first and rolls 1 at the third roll: Thom wins. */
function game(id: string, stake: number, extra: readonly string[] = []): string {
  return [
    DEATHROLL_HEADER,
    `G;${id};Thom Leboss;Vorn Cendrelune;${String(stake)};1000;${String(ACCEPTED)};${String(ACCEPTED + 120)}`,
    "R;Vorn Cendrelune;1000;412",
    "R;Thom Leboss;412;87",
    "R;Vorn Cendrelune;87;0",
    ...extra,
  ].join("\n");
}

/** Vorn challenges Thom for the stake; Thom rolls first and rolls 0 at the third roll: Vorn wins. */
function revenge(id: string, stake: number, extra: readonly string[] = []): string {
  return [
    DEATHROLL_HEADER,
    `G;${id};Vorn Cendrelune;Thom Leboss;${String(stake)};1000;${String(ACCEPTED + 600)};${String(ACCEPTED + 720)}`,
    "R;Thom Leboss;1000;412",
    "R;Vorn Cendrelune;412;87",
    "R;Thom Leboss;87;0",
    ...extra,
  ].join("\n");
}

describe("deathrolls", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let deathrolls: ReturnType<typeof createDeathrolls>;
  let announced: AnnouncedDeathroll[];
  let thom: Member;
  let vorn: Member;
  let sira: Member;
  const clock = () => new Date("2026-12-10T13:00:00Z");

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    announced = [];
    deathrolls = createDeathrolls({
      unitOfWork: createUnitOfWork(sql),
      clock,
      announcer: { announce: async (played) => void announced.push(played) },
    });
    thom = await createMember(sql, "confirmed", "Thom");
    vorn = await createMember(sql, "confirmed", "Vorn");
    sira = await createMember(sql, "confirmed", "Sira");
    const characters = await createGuildCharacters(sql, "Thom Leboss", "Vorn Cendrelune", "Sira Ventargent");
    for (const [index, member] of [thom, vorn, sira].entries()) {
      await characterRepository(sql).link(characters[index]?.id ?? "", member.id);
      await characterRepository(sql).setMain(member.id, characters[index]?.id ?? "");
    }
  });

  afterEach(async () => {
    await database.close();
  });

  it("keeps a game once, with the bet the guild placed on it, and the loser's debt until the winner confirms", async () => {
    const played = game("g1", 1200, ["B;Sira Ventargent;Thom Leboss;100", "B;Thom Leboss;Thom Leboss;50"]);
    expect(await deathrolls.recordFromGame(vorn, [played])).toEqual([
      "Deathroll Thom Leboss contre Vorn Cendrelune enregistré.",
    ]);
    expect(await deathrolls.recordFromGame(thom, [played])).toEqual(["Deathroll déjà connu."]);
    // A big stake goes to Discord.
    expect(announced).toEqual([{ id: "g1", winner: "Thom Leboss", loser: "Vorn Cendrelune", stake: 1200, rolls: 3 }]);
    // The guild's bet: Sira's stake on the winner, the players' own left aside; settled at once.
    const [bet] = (await createBets({ unitOfWork: createUnitOfWork(sql), clock }).list()).map((view) => view.bet);
    expect(bet?.title).toBe("Deathroll : Thom Leboss vs Vorn Cendrelune");
    expect(bet?.endedAt).toBeDefined();
    const treasury = createTreasury({ unitOfWork: createUnitOfWork(sql), clock });
    // Vorn owes the stake: no bet, no deathroll, until Thom confirms.
    expect(await treasury.debtOf(vorn)).toBe(1200);
    expect((await deathrolls.debtsOf(thom)).toConfirm.map((pair) => pair.id)).toEqual(["g1"]);
    await expect(deathrolls.confirmPayment(vorn, "g1")).rejects.toThrow(
      "Seul celui à qui la dette est due confirme le paiement.",
    );
    await deathrolls.confirmPayment(thom, "g1");
    expect(await treasury.debtOf(vorn)).toBe(0);
    // Paid, the debt stays in the players' history.
    const { owed, history } = await deathrolls.debtsOf(vorn);
    expect(owed).toEqual([]);
    expect(history.map((view) => [view.game.id, view.game.paidAt !== undefined])).toEqual([["g1", true]]);
    await expect(deathrolls.confirmPayment(thom, "g1")).rejects.toThrow("Ce paiement est déjà confirmé.");
  });

  it("ends the debt with the winner's confirmation sent from the game", async () => {
    await deathrolls.recordFromGame(thom, [game("g2", 300)]);
    expect(
      await deathrolls.recordFromGame(thom, [game("g2", 300, [`Y;Thom Leboss;${String(ACCEPTED + 600)}`])]),
    ).toEqual(["Paiement du deathroll confirmé."]);
    expect((await deathrolls.debtsOf(vorn)).owed).toEqual([]);
    expect(announced).toEqual([]);
  });

  it("sets two players' debts against each other: equal, they cancel out; else the one owed confirms the rest", async () => {
    const treasury = createTreasury({ unitOfWork: createUnitOfWork(sql), clock });
    await deathrolls.recordFromGame(thom, [game("e1", 10)]);
    expect(await deathrolls.recordFromGame(vorn, [revenge("e2", 10)])).toEqual([
      "Deathroll Vorn Cendrelune contre Thom Leboss enregistré : leurs dettes s'annulent.",
    ]);
    expect([await treasury.debtOf(vorn), await treasury.debtOf(thom)]).toEqual([0, 0]);

    await deathrolls.recordFromGame(thom, [game("u1", 300)]);
    await deathrolls.recordFromGame(vorn, [revenge("u2", 100)]);
    const { owed } = await deathrolls.debtsOf(vorn);
    expect(owed.map((pair) => [pair.creditor.name, pair.amount])).toEqual([["Thom Leboss", 200]]);
    expect(await treasury.debtOf(thom)).toBe(0);
    await expect(deathrolls.confirmPayment(vorn, "u2")).rejects.toThrow("Seul celui à qui la dette est due");
    // Thom confirms the 200 po from the game, through the game Vorn won: both are paid.
    expect(
      await deathrolls.recordFromGame(thom, [revenge("u2", 100, [`Y;Thom Leboss;${String(ACCEPTED + 900)}`])]),
    ).toEqual(["Paiement du deathroll confirmé."]);
    expect(await treasury.debtOf(vorn)).toBe(0);
    expect((await deathrolls.debtsOf(vorn)).history.every((view) => view.game.paidAt !== undefined)).toBe(true);
  });

  it("refuses a game sent by someone who did not play it, or out of the rules", async () => {
    await expect(deathrolls.recordFromGame(sira, [game("g3", 300)])).rejects.toThrow(
      "Seuls les joueurs de la partie, ou un officier qui la relaie, peuvent l'envoyer.",
    );
    await expect(
      deathrolls.recordFromGame(thom, [game("g3", 300).replace("R;Vorn Cendrelune;87;0", "")]),
    ).rejects.toThrow("La partie n'est pas finie.");
  });

  it("hands the debts and the games to the addon", async () => {
    await deathrolls.recordFromGame(thom, [game("g4", 500)]);
    const text = await createAddonGames({ unitOfWork: createUnitOfWork(sql), clock }).exportDeathrolls();
    const lines = text.split("\n");
    expect(lines[0]).toBe("VXV-DEATHROLLS-3");
    expect(lines).toContain("L;100");
    expect(lines).toContain(`X;${vorn.id};500`);
    expect(lines.some((line) => line.startsWith(`A;${thom.id};`))).toBe(true);
    expect(lines).toContain(`D;g4;${vorn.id};Vorn Cendrelune;${thom.id};Thom Leboss;500;${String(ACCEPTED + 120)}`);
    expect(lines).toContain(`H;g4;Thom Leboss;Vorn Cendrelune;500;${String(ACCEPTED + 120)};0`);
  });

  it("leaves aside the stake of a member without the role « Membre », and tells the addon who they are", async () => {
    const newcomer = await createMember(sql, "member", "Nox");
    const [nox] = await createGuildCharacters(sql, "Nox Ombre");
    await characterRepository(sql).link(nox.id, newcomer.id);
    await deathrolls.recordFromGame(thom, [
      game("g5", 300, ["B;Nox Ombre;Thom Leboss;100", "B;Sira Ventargent;Thom Leboss;40"]),
    ]);
    const [view] = await createBets({ unitOfWork: createUnitOfWork(sql), clock }).list();
    expect(view?.stakes.map((stake) => stake.memberId)).toEqual([sira.id]);
    const text = await createAddonGames({ unitOfWork: createUnitOfWork(sql), clock }).exportDeathrolls();
    expect(text.split("\n").filter((line) => line.startsWith("N;"))).toEqual([`N;${newcomer.id}`]);
  });
});
