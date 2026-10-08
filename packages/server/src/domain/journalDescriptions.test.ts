import { describe, expect, it } from "vitest";
import type { JournalEntry } from "./journal.ts";
import { describeJournalEntry } from "./journalDescriptions.ts";

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
    const reserved = { startsAt: "2026-12-10T20:00:00.000Z", raids: ["Onyxia"], softReservesPerPlayer: 1 };
    expect(describeJournalEntry({ ...entry, after: { ...reserved, audience: "Réservé à Raideur R1" } })).toBe(
      "Onyxia, le 10/12/2026 21:00, 1 SR par joueur. Réservé à Raideur R1",
    );
    const outing = {
      startsAt: "2026-12-10T20:00:00.000Z",
      title: "Raid sur Astranaar",
      raids: [],
      softReservesPerPlayer: 0,
    };
    expect(describeJournalEntry({ ...entry, after: { ...outing, audience: "Ouvert à tous" } })).toBe(
      "Raid sur Astranaar, le 10/12/2026 21:00. Ouvert à tous",
    );
  });

  it("summarizes a duel an officer settles: its players, its time, its winner unless called off", () => {
    const duel = {
      challenger: "Vorn Cendrelune",
      opponent: "Morgane Nuitsombre",
      scheduledAt: "2026-12-10T20:00:00.000Z",
    };
    const entry: JournalEntry = {
      id: "10",
      occurredAt: new Date(),
      actorName: "Officier",
      action: "duel.result",
      entity: "duel",
      entityId: "d",
      before: null,
      after: { ...duel, winner: "Morgane Nuitsombre" },
      reason: "Vu en jeu",
    };
    expect(describeJournalEntry(entry)).toBe(
      "Vorn Cendrelune contre Morgane Nuitsombre, 10/12/2026 21:00 : Morgane Nuitsombre gagne",
    );
    expect(describeJournalEntry({ ...entry, action: "duel.cancel", after: duel })).toBe(
      "Vorn Cendrelune contre Morgane Nuitsombre, 10/12/2026 21:00",
    );
  });

  it("summarizes a bet opening: its title, its choices and its closing time in the guild time zone", () => {
    const entry: JournalEntry = {
      id: "9",
      occurredAt: new Date(),
      actorName: "Officier",
      action: "bet.create",
      entity: "bet",
      entityId: "b",
      before: null,
      after: { title: "Qui meurt en premier ?", choices: ["Un tank", "Un heal"], closesAt: "2026-12-10T20:00:00.000Z" },
      reason: "Pour le raid",
    };
    expect(describeJournalEntry(entry)).toBe(
      "« Qui meurt en premier ? » : Un tank, Un heal ; fermeture le 10/12/2026 21:00",
    );
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

  it("shows the title an officer gave and its week", () => {
    const entry: JournalEntry = {
      id: "5",
      occurredAt: new Date(),
      actorName: "Officier",
      action: "title.give",
      entity: "title",
      entityId: "2026-10-07/princess",
      before: null,
      after: { title: "Princesse", week: "2026-10-07", holder: "Morgane Nuitsombre" },
      reason: "Tous les soins du raid",
    };
    expect(describeJournalEntry(entry)).toBe("Princesse : Morgane Nuitsombre, semaine du 7 octobre");
  });
});
