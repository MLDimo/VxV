import { describe, expect, it } from "vitest";
import { startCore } from "../core.ts";

/** Lua: the ledger of games over between Thom and Vorn, without the website's data: { winner, loser, stake }. */
const LEDGER = (games: string) => `
  local over = { ${games} }
  local rules = {
    Winner = function(game) return game.w end,
    Loser = function(game) return game.l end,
  }
  local ledger = VXV.DiceGames.Ledger(nil, over, rules)
  local unpaid = {}
  for _, debt in ipairs(ledger.Unpaid()) do
    unpaid[#unpaid + 1] = { debt.winner, debt.loser, debt.stake, #debt.ids }
  end
  local history = {}
  for _, game in ipairs(ledger.History("Thom Leboss")) do
    history[#history + 1] = VXV.DiceGames.HistoryText(game, "Thom Leboss")
  end
  return { count = #unpaid, unpaid = unpaid, history = history }
`;
const game = (id: string, winner: string, loser: string, stake: number, endedAt: number) =>
  `${id} = { stake = ${String(stake)}, endedAt = ${String(endedAt)}, w = "${winner}", l = "${loser}" }`;

describe("Le Dé Pipé's ledger (owner's request of 9 November)", () => {
  it("cancels out two players' equal debts, and keeps what one owes the other beyond", () => {
    const { client, errors } = startCore({ bundles: [] });
    const even = client(
      LEDGER(
        `${game("g1", "Thom Leboss", "Vorn Cendrelune", 10, 1)}, ${game("g2", "Vorn Cendrelune", "Thom Leboss", 10, 2)}`,
      ),
    ) as { count: number; history: string[] };
    expect(even.count).toBe(0);
    expect(even.history).toEqual([
      expect.stringMatching(/^Tu devais 10 po à Vorn Cendrelune · .* · annulée$/),
      expect.stringMatching(/^Vorn Cendrelune te devait 10 po · .* · annulée$/),
    ]);
    const beyond = client(
      LEDGER(
        `${game("g1", "Thom Leboss", "Vorn Cendrelune", 300, 1)}, ${game("g2", "Vorn Cendrelune", "Thom Leboss", 100, 2)}`,
      ),
    ) as { unpaid: unknown[] };
    expect(beyond.unpaid).toEqual([["Thom Leboss", "Vorn Cendrelune", 200, 2]]);
    expect(errors()).toEqual([]);
  });
});
