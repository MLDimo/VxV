import type { MemberRole } from "@vxv/server/domain/members";

const ROLE_LABELS: Record<MemberRole, string> = {
  member: "Membre",
  treasurer: "Trésorier",
  officer: "Officier",
  gm: "Maître de guilde",
};

/** Roles shown next to the member's name, highest first; "Membre" only when it is the only one. */
export function rolesLabel(roles: readonly MemberRole[]): string {
  const ranked = [...roles].reverse();
  const shown = ranked.length > 1 ? ranked.filter((role) => role !== "member") : ranked;
  return shown.map((role) => ROLE_LABELS[role]).join(", ");
}
