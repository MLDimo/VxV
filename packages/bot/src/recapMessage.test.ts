import type { GuildEvent, RaidRecap } from "@vxv/server";
import { describe, expect, it } from "vitest";
import { recapMessage } from "./recapMessage.ts";

const event: GuildEvent = {
  id: "e",
  startsAt: new Date("2026-12-10T20:00:00Z"),
  softReservesPerPlayer: 1,
  raids: [{ id: "onyxia", name: "Onyxia" }],
  kind: "raid",
  title: undefined,
  role: undefined,
  discordMessageId: undefined,
};
const start = Date.UTC(2026, 11, 10, 20) / 1000;

describe("raid recap message", () => {
  it("tells the bosses killed and how long, the items given and how, and the deaths", () => {
    const recap: RaidRecap = {
      event,
      kills: ["Gardienne", "Onyxia"],
      durationMs: 72 * 60 * 1000,
      loots: [
        { itemName: "Tête d'Onyxia", winnerName: "Thom Leboss", method: "soft_reserve_plus" },
        { itemName: "Écaille d'Onyxia", winnerName: "Ðéjà Vu", method: "loot_council" },
      ],
      deaths: [{ name: "Ciel Gris", count: 3 }],
    };
    expect(recapMessage(recap, "https://vxv.test")).toEqual({
      content: [
        `📜 **Récap · Onyxia** <t:${String(start)}:D> · https://vxv.test/evenements/e`,
        "⚔️ 2 boss tués en 1 h 12 : Gardienne, Onyxia",
        "💰 Tête d'Onyxia → Thom Leboss (SR+) · Écaille d'Onyxia → Ðéjà Vu (Loot council)",
        "💀 Morts : Ciel Gris ×3",
      ].join("\n"),
      allowed_mentions: { parse: [] },
    });
  });

  it("says so when nothing happened, and stays within Discord's limit", () => {
    const empty = recapMessage({ event, kills: [], durationMs: undefined, loots: [], deaths: [] }, "https://vxv.test");
    expect(empty.content).toContain("⚔️ Aucun boss tué.\n💰 Aucun objet donné.\n💀 Aucune mort.");
    const loots = Array.from({ length: 200 }, () => ({
      itemName: "Objet au nom très long",
      winnerName: "Joueur",
      method: "free_roll" as const,
    }));
    const long = recapMessage({ event, kills: ["Onyxia"], durationMs: 60000, loots, deaths: [] }, "https://vxv.test");
    expect(long.content?.length).toBe(2000);
  });
});
