import type { EventCreationRecord, JournalAction, JournalEntry, RosterImportSummary } from "@vxv/server";
import { count, formatDateTime, raidTitle, softReserveCount } from "./format";

export const JOURNAL_ACTION_LABELS: Record<JournalAction, string> = {
  "roster.import": "Import de la liste de guilde",
  "event.create": "Création d'un événement",
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

/** One-line description of what an officer action changed. */
export function describeJournalEntry(entry: JournalEntry): string {
  switch (entry.action) {
    case "roster.import":
      return describeRosterImport(entry.after as RosterImportSummary);
    case "event.create":
      return describeEventCreation(entry.after as EventCreationRecord);
  }
}
