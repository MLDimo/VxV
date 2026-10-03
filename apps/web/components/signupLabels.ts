import type { SignupRole, SignupStatus } from "@vxv/server";

export const ROLE_LABELS: Record<SignupRole, { label: string; icon: string }> = {
  tank: { label: "Tank", icon: "🛡️" },
  healer: { label: "Soigneur", icon: "✚" },
  dps: { label: "DPS", icon: "⚔️" },
};

export const STATUS_LABELS: Record<SignupStatus, string> = {
  present: "Présent",
  maybe: "Peut-être",
  late: "En retard",
  bench: "Banc",
  absent: "Absent",
};

/** Usual specialisations by class, offered as suggestions; any text is accepted. */
export const SPEC_SUGGESTIONS: Record<string, string[]> = {
  WARRIOR: ["Armes", "Fureur", "Protection"],
  PALADIN: ["Sacré", "Protection", "Vindicte"],
  HUNTER: ["Maîtrise des bêtes", "Précision", "Survie"],
  ROGUE: ["Assassinat", "Combat", "Finesse"],
  PRIEST: ["Discipline", "Sacré", "Ombre"],
  SHAMAN: ["Élémentaire", "Amélioration", "Restauration"],
  MAGE: ["Arcanes", "Feu", "Givre"],
  WARLOCK: ["Affliction", "Démonologie", "Destruction"],
  DRUID: ["Équilibre", "Combat farouche", "Restauration"],
};
