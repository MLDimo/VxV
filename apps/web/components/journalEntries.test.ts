import type { JournalEntry } from "@vxv/server";
import { describe, expect, it } from "vitest";
import { describeJournalEntry } from "./journalEntries";

describe("describeJournalEntry", () => {
  it("summarizes a roster import", () => {
    const entry: JournalEntry = {
      id: "1",
      occurredAt: new Date(),
      actorName: "Officier",
      action: "roster.import",
      entity: "roster",
      entityId: "guild",
      before: null,
      after: { added: ["A B"], left: ["C D", "E F"], rejoined: [], classChanged: [], inGuild: 1 },
      reason: "Mise à jour",
    };
    expect(describeJournalEntry(entry)).toBe(
      "1 ajouté, 2 départs, 0 retours, 0 changements de classe, 1 personnage dans la guilde",
    );
  });

  it("summarizes an event creation in the guild time zone", () => {
    const entry: JournalEntry = {
      id: "2",
      occurredAt: new Date(),
      actorName: "Officier",
      action: "event.create",
      entity: "event",
      entityId: "e",
      before: null,
      after: { startsAt: "2026-12-10T20:00:00.000Z", raids: ["Mont Hyjal", "Onyxia"], softReservesPerPlayer: 2 },
      reason: "Raid",
    };
    expect(describeJournalEntry(entry)).toBe("Mont Hyjal + Onyxia, le 10/12/2026 21:00, 2 SR par joueur");
  });

  it("names the excluded item, its event and the removed reserves", () => {
    const entry: JournalEntry = {
      id: "3",
      occurredAt: new Date(),
      actorName: "Officier",
      action: "exclusion.add",
      entity: "item",
      entityId: "e/20",
      before: null,
      after: {
        itemName: "Tête d'Onyxia",
        raids: ["Onyxia"],
        eventStartsAt: "2026-12-10T20:00:00.000Z",
        removedSoftReserves: ["Ðéjà Vu", "Eole Hermes"],
      },
      reason: "Tank",
    };
    expect(describeJournalEntry(entry)).toBe(
      "« Tête d'Onyxia » (Onyxia, 10/12/2026 21:00) ; SR retirées : Ðéjà Vu, Eole Hermes",
    );
  });

  it("shows a correction's reserves before and after", () => {
    const entry: JournalEntry = {
      id: "4",
      occurredAt: new Date(),
      actorName: "Officier",
      action: "softReserve.override",
      entity: "softReserve",
      entityId: "e/c",
      before: null,
      after: {
        characterName: "Ðéjà Vu",
        raids: ["Onyxia"],
        eventStartsAt: "2026-12-10T20:00:00.000Z",
        before: ["Tête d'Onyxia"],
        after: [],
      },
      reason: "Erreur",
    };
    expect(describeJournalEntry(entry)).toBe(
      "SR de Ðéjà Vu (Onyxia, 10/12/2026 21:00) : avant « Tête d'Onyxia » ; après aucune",
    );
  });
});
