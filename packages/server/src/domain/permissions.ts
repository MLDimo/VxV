import type { MemberRole } from "./members.ts";

/** Officers and the guild master run raids: events, exclusions, roster import and overrides. */
export function canManageRaids(role: MemberRole): boolean {
  return role === "officer" || role === "gm";
}
