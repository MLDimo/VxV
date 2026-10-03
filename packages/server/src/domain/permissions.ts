import type { MemberRole } from "./members.ts";

/** Officers and the guild master run raids: events, exclusions, roster import and overrides. */
export function canManageRaids(roles: readonly MemberRole[]): boolean {
  return roles.includes("officer") || roles.includes("gm");
}
