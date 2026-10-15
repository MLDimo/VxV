import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CHIFOUMI_HEADER } from "../domain/chifoumis.ts";
import type { Member } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createGuildCharacters, createMember } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createAddonGames } from "./addonGames.ts";
import { createBets } from "./bets.ts";
import { createChifoumis } from "./chifoumis.ts";
import { createRanking } from "./ranking.ts";
import { createTreasury } from "./treasury.ts";

const ACCEPTED = 1796904000;
/** Thom challenges Vorn for the stake: Thom's rock beats Vorn's scissors twice, after a draw. */
function game(id: string, stake: number, extra: readonly string[] = []): string {
  return [
    CHIFOUMI_HEADER,
    `G;${id};Thom Leboss;Vorn Cendrelune;${String(stake)};${String(ACCEPTED)};${String(ACCEPTED + 120)}`,
    "M;feuille;feuille",
    "M;pierre;ciseaux",
    "M;pierre;ciseaux",
    ...extra,
  ].join("\n");
}

describe("Chi Fou Mi", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let chifoumis: ReturnType<typeof createChifoumis>;
  let thom: Member;
  let vorn: Member;
  let sira: Member;
  const clock = () => new Date("2026-12-10T13:00:00Z");

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    chifoumis = createChifoumis({ unitOfWork: createUnitOfWork(sql), clock });
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

  it("keeps a game once, with the guild's bet, and the loser's debt until the winner confirms", async () => {
    const played = game("c1", 300, ["B;Sira Ventargent;Thom Leboss;100", "B;Thom Leboss;Thom Leboss;50"]);
    expect(await chifoumis.recordFromGame(vorn, [played])).toEqual([
      "Chi Fou Mi Thom Leboss contre Vorn Cendrelune enregistré.",
    ]);
    expect(await chifoumis.recordFromGame(thom, [played])).toEqual(["Chi Fou Mi déjà connu."]);
    // The guild's bet: Sira's stake on the winner, the players' own left aside; settled at once.
    const [bet] = await createBets({ unitOfWork: createUnitOfWork(sql), clock }).list();
    expect(bet?.bet.title).toBe("Chi Fou Mi : Thom Leboss vs Vorn Cendrelune");
    expect(bet?.stakes.map((stake) => stake.memberId)).toEqual([sira.id]);
    expect(bet?.bet.endedAt).toBeDefined();
    // Vorn owes the stake until Thom confirms, from the website or from the game.
    const treasury = createTreasury({ unitOfWork: createUnitOfWork(sql), clock });
    expect(await treasury.debtOf(vorn)).toBe(300);
    expect((await chifoumis.debtsOf(thom)).toConfirm.map((view) => view.game.id)).toEqual(["c1"]);
    await expect(chifoumis.confirmPayment(vorn, "c1")).rejects.toThrow("Seul le gagnant confirme le paiement.");
    expect(
      await chifoumis.recordFromGame(thom, [game("c1", 300, [`Y;Thom Leboss;${String(ACCEPTED + 600)}`])]),
    ).toEqual(["Paiement du Chi Fou Mi confirmé."]);
    expect(await treasury.debtOf(vorn)).toBe(0);
  });

  it("plays for 0 po: no debt, nothing to confirm", async () => {
    await chifoumis.recordFromGame(thom, [game("c2", 0)]);
    expect(await createTreasury({ unitOfWork: createUnitOfWork(sql), clock }).debtOf(vorn)).toBe(0);
    expect((await chifoumis.debtsOf(thom)).toConfirm).toEqual([]);
    expect((await chifoumis.list()).map((view) => [view.winner.name, view.loser.name])).toEqual([
      ["Thom Leboss", "Vorn Cendrelune"],
    ]);
  });

  it("refuses a game sent by someone who did not play it, or out of the rules", async () => {
    await expect(chifoumis.recordFromGame(sira, [game("c3", 10)])).rejects.toThrow(
      "Seuls les joueurs de la partie, ou un officier qui la relaie, peuvent l'envoyer.",
    );
    await expect(chifoumis.recordFromGame(thom, [game("c3", 10).replace(/\nM;pierre;ciseaux$/u, "")])).rejects.toThrow(
      "La partie n'est pas finie.",
    );
  });

  it("hands the debts and the games to the addon, and ranks the players by net gain", async () => {
    await chifoumis.recordFromGame(thom, [game("c4", 500)]);
    const lines = (await createAddonGames({ unitOfWork: createUnitOfWork(sql), clock }).exportChifoumis()).split("\n");
    expect(lines[0]).toBe("VXV-CHIFOUMIS-2");
    expect(lines).toContain(`X;${vorn.id}`);
    // Each player's portrait, by their main character: the window draws them.
    expect(lines.some((line) => line.startsWith(`A;${thom.id};`) && line.includes("voleur"))).toBe(true);
    expect(lines).toContain(`D;c4;${vorn.id};Vorn Cendrelune;${thom.id};Thom Leboss;500;${String(ACCEPTED + 120)}`);
    const ranking = createRanking({ unitOfWork: createUnitOfWork(sql), clock });
    const board = await ranking.board("chifoumi", "always");
    expect(board.lines.map((line) => [line.memberId, line.value])).toEqual([
      [thom.id, 500],
      [vorn.id, -500],
    ]);
  });
});
