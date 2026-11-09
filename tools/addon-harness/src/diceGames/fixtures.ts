import { formatAddonGames, type AddonGamesFacts } from "@vxv/server/domain/addonGames";
import { DEBT_LIMIT } from "@vxv/server/domain/bets";
import type { Character } from "@vxv/server/domain/characters";

/** A character of the guild, each linked to its own member (its id). */
function character(name: string): Character {
  const [firstName = "", lastName = ""] = name.split(" ");
  return {
    id: `m-${firstName.toLowerCase()}`,
    firstName,
    lastName,
    characterClass: "ROGUE",
    memberId: `m-${firstName.toLowerCase()}`,
    isMain: true,
    inGuild: true,
  };
}

/** The member id of a character of diceGamesData. */
export const memberOf = (name: string) => `m-${(name.split(" ")[0] ?? "").toLowerCase()}`;

/**
 * The website's data of one of Le Dé Pipé's games (VXV-DEATHROLLS, VXV-CHIFOUMIS) for Thom Leboss, Vorn Cendrelune and
 * Sira Ventargent, nobody owing anything unless told.
 */
export function diceGamesData(header: string, facts: Partial<AddonGamesFacts> = {}): string {
  return formatAddonGames(header, {
    officers: [],
    characters: ["Thom Leboss", "Vorn Cendrelune", "Sira Ventargent"].map(character),
    debts: [],
    debtLimit: DEBT_LIMIT,
    newcomers: [],
    portraits: [],
    games: [],
    exportedAt: new Date("2026-12-10T07:00:00Z"),
    ...facts,
  });
}
