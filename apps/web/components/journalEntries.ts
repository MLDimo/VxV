import type {
  EventCreationRecord,
  ExclusionRecord,
  JournalAction,
  JournalEntry,
  RosterImportSummary,
} from "@vxv/server";
import { count, formatDateTime, raidTitle, softReserveCount } from "./format";

export const JOURNAL_ACTION_LABELS: Record<JournalAction, string> = {
  "roster.import": "Import de la liste de guilde",
  "event.create": "Création d'un événement",
  "exclusion.add": "Objet exclu des SR",
  "exclusion.remove": "Objet de nouveau réservable",
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

/** One-line description of what an officer action changed. */
export function describeJournalEntry(entry: JournalEntry): string {
  switch (entry.action) {
    case "roster.import":
      return describeRosterImport(entry.after as RosterImportSummary);
    case "event.create":
      return describeEventCreation(entry.after as EventCreationRecord);
    case "exclusion.add":
    case "exclusion.remove":
      return describeExclusion(entry.after as ExclusionRecord);
  }
}
