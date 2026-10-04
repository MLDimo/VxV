import { GUILD_TIME_ZONE } from "./dateTime.ts";
import type { SignupRole, SignupStatus } from "./signups.ts";

/** French wording shared by the website and the bot. */

/** "1 personnage", "3 personnages". */
export function count(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

/** Acronyms are invariable in French: "1 SR", "2 SR". */
export function softReserveCount(value: number): string {
  return count(value, "SR", "SR");
}

const DATE_TIME = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: GUILD_TIME_ZONE,
});
const EVENT_DATE = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: GUILD_TIME_ZONE,
});

/** Short date and time, for lists: "10/12/2026 21:00". */
export function formatDateTime(date: Date): string {
  return DATE_TIME.format(date);
}

/** Full date and time of a raid night: "jeudi 10 décembre 2026 à 21:00". */
export function formatEventDate(date: Date): string {
  return EVENT_DATE.format(date);
}

/** Raids of an evening joined in one title: "Onyxia + Mont Hyjal". */
export function raidTitle(raidNames: readonly string[]): string {
  return raidNames.join(" + ");
}

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
