import type { MemberRole } from "./members.ts";

/** Officers and the guild master run raids: events, exclusions, roster import and overrides. */
export function canManageRaids(roles: readonly MemberRole[]): boolean {
  return roles.includes("officer") || roles.includes("gm");
}

/** The treasurer alone validates the gold that changes hands (decision of 3 October: not the GM by right). */
export function canManageTreasury(roles: readonly MemberRole[]): boolean {
  return roles.includes("treasurer");
}
