import type {
  EventCreationRecord,
  ExclusionRecord,
  JournalAction,
  JournalEntry,
  LootCouncilRecord,
  RaidLogImportRecord,
  SoftReserveOverrideRecord,
} from "./journal.ts";
import { count, formatDateTime, raidTitle, softReserveCount } from "./labels.ts";
import type { RosterImportSummary } from "./roster.ts";

export const JOURNAL_ACTION_LABELS: Record<JournalAction, string> = {
  "roster.import": "Import de la liste de guilde",
  "event.create": "Création d'un événement",
  "exclusion.add": "Objet exclu des SR",
  "exclusion.remove": "Objet de nouveau réservable",
  "softReserve.override": "SR corrigées par un officier",
  "raid.import": "Import du journal d'un raid",
  "loot.council": "Objet attribué au loot council",
};

export function describeRosterImport(summary: RosterImportSummary): string {
  return [
    count(summary.added.length, "ajouté"),
    count(summary.left.length, "départ"),
    count(summary.rejoined.length, "retour"),
    count(summary.classChanged.length, "changement de classe", "changements de classe"),
    `${count(summary.inGuild, "personnage")} dans la guilde`,
  ].join(", ");
}

function describeEventCreation(event: EventCreationRecord): string {
  return `${raidTitle(event.raids)}, le ${formatDateTime(new Date(event.startsAt))}, ${softReserveCount(event.softReservesPerPlayer)} par joueur`;
}

function describeExclusion(exclusion: ExclusionRecord): string {
  const where = `${raidTitle(exclusion.raids)}, ${formatDateTime(new Date(exclusion.eventStartsAt))}`;
  const removed =
    exclusion.removedSoftReserves.length > 0 ? ` ; SR retirées : ${exclusion.removedSoftReserves.join(", ")}` : "";
  return `« ${exclusion.itemName} » (${where})${removed}`;
}

function itemList(names: readonly string[]): string {
  return names.length === 0 ? "aucune" : names.map((name) => `« ${name} »`).join(", ");
}

function describeOverride(override: SoftReserveOverrideRecord): string {
  const where = `${raidTitle(override.raids)}, ${formatDateTime(new Date(override.eventStartsAt))}`;
  return `SR de ${override.characterName} (${where}) : avant ${itemList(override.before)} ; après ${itemList(override.after)}`;
}

/** "2 boss tués, 12 présents, 5 objets ajoutés", then what the website did not know. */
export function describeRaidLogImport(record: Omit<RaidLogImportRecord, "raids" | "eventStartsAt">): string {
  const parts = [
    `${count(record.kills, "boss", "boss")} tué${record.kills === 1 ? "" : "s"}`,
    count(record.present, "présent"),
    count(record.loots, "objet ajouté", "objets ajoutés"),
  ];
  if (record.unknownCharacters.length > 0) {
    parts.push(`personnages inconnus de la liste de guilde : ${record.unknownCharacters.join(", ")}`);
  }
  if (record.unknownLoots > 0) {
    parts.push(
      count(record.unknownLoots, "objet hors des raids de l'événement", "objets hors des raids de l'événement"),
    );
  }
  return parts.join(", ");
}

function describeLootCouncil(record: LootCouncilRecord): string {
  const where = `${raidTitle(record.raids)}, ${formatDateTime(new Date(record.eventStartsAt))}`;
  return `Objet « ${record.itemName} » attribué à ${record.characterName} au loot council (${where})`;
}

/** One-line description of what an officer action changed, as the website and the addon show it. */
export function describeJournalEntry(entry: JournalEntry): string {
  switch (entry.action) {
    case "roster.import":
      return describeRosterImport(entry.after as RosterImportSummary);
    case "event.create":
      return describeEventCreation(entry.after as EventCreationRecord);
    case "exclusion.add":
    case "exclusion.remove":
      return describeExclusion(entry.after as ExclusionRecord);
    case "softReserve.override":
      return describeOverride(entry.after as SoftReserveOverrideRecord);
    case "raid.import": {
      const record = entry.after as RaidLogImportRecord;
      return `${raidTitle(record.raids)}, ${formatDateTime(new Date(record.eventStartsAt))} : ${describeRaidLogImport(record)}`;
    }
    case "loot.council":
      return describeLootCouncil(entry.after as LootCouncilRecord);
  }
}
