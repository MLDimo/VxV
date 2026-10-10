import type { MemberRole } from "./members.ts";

/** Officers and the guild master run raids: events, exclusions, roster import and overrides. */
export function canManageRaids(roles: readonly MemberRole[]): boolean {
  return roles.includes("officer") || roles.includes("gm");
}

/** The treasurer alone validates the gold that changes hands (decision of 3 October: not the GM by right). */
export function canManageTreasury(roles: readonly MemberRole[]): boolean {
  return roles.includes("treasurer");
}

/**
 * Bets and deathrolls are for the holders of the guild's Discord role « Membre » (decision of 10 October): a newcomer
 * brings no gold from RMT into the guild's games, which could get other players banned.
 */
export function canGamble(roles: readonly MemberRole[]): boolean {
  return roles.includes("confirmed");
}

/** Why a member without the role « Membre » cannot bet nor play a deathroll. */
export const GAMBLE_REFUSAL =
  "Paris et deathroll sont réservés au rôle Membre sur Discord (reçu à l'instant : reconnecte-toi au site).";
