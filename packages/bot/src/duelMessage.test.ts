import type { AnnouncedDuel } from "@vxv/server";
import { describe, expect, it } from "vitest";
import { duelMessage } from "./duelMessage.ts";

const SITE = "https://vxv.test";
const scheduledAt = new Date("2026-12-12T20:00:00Z");
const announced = (overrides: Partial<AnnouncedDuel> = {}): AnnouncedDuel => ({
  duel: {
    id: "d1",
    challengerId: "vorn",
    opponentId: "morgane",
    scheduledAt,
    place: "Porte d'Orgrimmar",
    createdAt: scheduledAt,
    accepted: undefined,
    betId: undefined,
    winnerId: undefined,
    playedAt: undefined,
    cancelledAt: undefined,
    discordMessage: undefined,
  },
  status: "proposed",
  challenger: "Vorn Cendrelune",
  opponent: "Morgane Nuitsombre",
  opponentDiscordId: "200",
  winner: undefined,
  ...overrides,
});

describe("duel message", () => {
  it("calls the challenged member once, with the duel's time and place", () => {
    const message = duelMessage(announced(), SITE);
    expect(message.content).toBe("<@200>, Vorn Cendrelune te défie en duel !");
    expect(message.allowed_mentions).toEqual({ users: ["200"] });
    const [embed] = message.embeds ?? [];
    expect(embed?.title).toBe("⚔️ Duel : Vorn Cendrelune contre Morgane Nuitsombre");
    const start = Date.UTC(2026, 11, 12, 20) / 1000;
    expect(embed?.description).toBe(
      `📅 <t:${start}:F> (<t:${start}:R>)\n📍 Porte d'Orgrimmar\n⏳ En attente de la réponse du joueur défié.`,
    );
  });

  it("leads to the bet once accepted, and names the winner once played, calling nobody", () => {
    const base = announced();
    const scheduled = duelMessage({ ...base, status: "scheduled", duel: { ...base.duel, betId: "b1" } }, SITE);
    expect(scheduled.content).toBe("");
    expect(scheduled.allowed_mentions).toEqual({ users: [] });
    expect(JSON.stringify(scheduled.components)).toContain(`${SITE}/paris/b1`);
    const played = duelMessage({ ...base, status: "played", winner: "Morgane Nuitsombre" }, SITE);
    expect(played.embeds?.[0]?.description).toMatch(/🏆 Morgane Nuitsombre gagne le duel\.$/);
  });
});
