import type { MemberRole } from "@vxv/server/domain/members";

const ROLE_LABELS: Record<MemberRole, string> = {
  member: "Nouveau membre",
  confirmed: "Membre",
  treasurer: "Trésorier",
  officer: "Officier",
  gm: "Maître de guilde",
};

/** Everybody on the guild's Discord server, then the holders of its role « Membre ». */
const BASE_ROLES: ReadonlySet<MemberRole> = new Set(["member", "confirmed"]);

/** Roles shown next to the member's name, highest first; the base one only when there is no other. */
export function rolesLabel(roles: readonly MemberRole[]): string {
  const ranked = [...roles].reverse();
  const granted = ranked.filter((role) => !BASE_ROLES.has(role));
  return (granted.length > 0 ? granted : ranked.slice(0, 1)).map((role) => ROLE_LABELS[role]).join(", ");
}
