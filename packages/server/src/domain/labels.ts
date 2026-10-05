import { GUILD_TIME_ZONE } from "./dateTime.ts";
import type { LootMethod } from "./history.ts";
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

const SHORT_DAY = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: GUILD_TIME_ZONE,
});
const SHORT_TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: GUILD_TIME_ZONE });

/** Short day and time of a raid night, for a card: "jeu. 10 déc. · 21h00". */
export function formatShortEventDate(date: Date): string {
  const day = SHORT_DAY.format(date).replace(/^\p{Ll}/u, (letter) => letter.toUpperCase());
  return `${day} · ${SHORT_TIME.format(date).replace(":", "h")}`;
}

/** Full date and time of a raid night: "jeudi 10 décembre 2026 à 21:00". */
export function formatEventDate(date: Date): string {
  return EVENT_DATE.format(date);
}

const MS_PER_MINUTE = 60 * 1000;
const MINUTES_PER_HOUR = 60;

/** "1 h 05", "45 min". */
export function formatDuration(durationMs: number): string {
  const minutes = Math.round(durationMs / MS_PER_MINUTE);
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  return hours > 0 ? `${String(hours)} h ${String(rest).padStart(2, "0")}` : `${String(minutes)} min`;
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

export const LOOT_METHOD_LABELS: Record<LootMethod, string> = {
  soft_reserve: "SR",
  soft_reserve_plus: "SR+",
  free_roll: "Roll libre",
  loot_council: "Loot council",
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
