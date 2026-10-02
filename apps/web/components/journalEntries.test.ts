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
});
