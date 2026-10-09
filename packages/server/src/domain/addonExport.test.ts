import { describe, expect, it } from "vitest";
import type { Character } from "./characters.ts";
import { ADDON_EVENT_HEADER, formatAddonEvent, type AddonEventFacts } from "./addonExport.ts";
import type { Signup } from "./signups.ts";
import type { BoardItem } from "./softReserves.ts";

const officer: Character = {
  id: "c-officer",
  firstName: "Ðéjà",
  lastName: "Vu",
  characterClass: "ROGUE",
  memberId: "m-officer",
  isMain: true,
  inGuild: true,
};

function signup(characterId: string, characterName: string, extra: Partial<Signup> = {}): Signup {
  return {
    eventId: "e1",
    memberId: `m-${characterId}`,
    characterId,
    characterName,
    characterClass: "PRIEST",
    role: "healer",
    spec: "Sacré",
    signedUpAt: new Date("2026-12-01T12:00:00Z"),
    status: "present",
    ...extra,
  };
}

function item(itemId: number, name: string, extra: Partial<BoardItem> = {}): BoardItem {
  return {
    itemId,
    name,
    raidName: "Onyxia",
    bossName: "Onyxia",
    reservedBy: [],
    alreadyOwnedBy: 0,
    excluded: false,
    mine: false,
    ...extra,
  };
}

const facts: AddonEventFacts = {
  event: {
    id: "e1",
    startsAt: new Date("2026-12-10T20:00:00Z"),
    softReservesPerPlayer: 2,
    raids: [
      { id: "onyxia", name: "Onyxia" },
      { id: "mont-hyjal", name: "Mont Hyjal" },
    ],
    kind: "raid",
    title: undefined,
    role: { id: "1194373648929263676", name: "Raideur R1" },
    discordMessageId: undefined,
  },
  signups: [
    signup("c-thom", "Thom Leboss"),
    signup("c-alt", "Ciel Gris", { characterClass: "WARRIOR", role: "tank", spec: "Protection", status: "bench" }),
  ],
  board: [
    item(10, "Cape de la gardienne", { bossName: "Gardienne" }),
    item(20, "Tête d'Onyxia", {
      reservedBy: [
        { characterId: "c-thom", characterName: "Thom Leboss", characterClass: "PRIEST", bonus: 20 },
        { characterId: "c-alt", characterName: "Ciel Gris", characterClass: "WARRIOR", bonus: 0 },
      ],
    }),
    item(21, "Sac en peau", {
      reservedBy: [{ characterId: "c-thom", characterName: "Thom Leboss", characterClass: "PRIEST", bonus: 0 }],
    }),
    item(30, "Écaille", { excluded: true }),
  ],
  officers: [officer],
  mainCharacterIds: new Set(["c-thom", "c-officer"]),
  journal: [
    {
      id: "7",
      occurredAt: new Date("2026-12-09T18:00:00Z"),
      actorName: "Officier",
      action: "exclusion.add",
      entity: "exclusion",
      entityId: "e1/30",
      before: null,
      after: {
        itemName: "Écaille",
        raids: ["Onyxia", "Mont Hyjal"],
        eventStartsAt: "2026-12-10T20:00:00.000Z",
        removedSoftReserves: [],
      },
      reason: "Pour le tank;\nprincipal",
    },
  ],
  changes: [
    {
      id: "Thom Leboss#1796900000#42",
      eventId: "e1",
      betId: undefined,
      duelId: undefined,
      missionId: undefined,
      author: "Thom Leboss",
      accepted: true,
      message: "SR enregistrées.",
    },
    {
      id: "Ciel Gris#1796900100#7",
      eventId: "e1",
      betId: undefined,
      duelId: undefined,
      missionId: undefined,
      author: "Ciel Gris",
      accepted: false,
      message: "Refusé; trop tard",
    },
  ],
  exportedAt: new Date("2026-12-10T19:45:00Z"),
};

describe("formatAddonEvent", () => {
  it("writes the event, its officers, the reserved or excluded items, the sign-ups, the journal and the changes", () => {
    expect(formatAddonEvent(facts).split("\n")).toEqual([
      ADDON_EVENT_HEADER,
      "E;e1;1796932800;1796931900;2;Onyxia + Mont Hyjal;onyxia,mont-hyjal;Réservé à Raideur R1",
      "O;Ðéjà Vu",
      "I;20;Tête d'Onyxia;Onyxia;0",
      "I;21;Sac en peau;Onyxia;0",
      "I;30;Écaille;Onyxia;1",
      "S;Thom Leboss;PRIEST;healer;present;0;Sacré;20:20,21:0",
      "S;Ciel Gris;WARRIOR;tank;bench;1;Protection;20:0",
      "J;1796839200;Officier;Objet exclu des SR : « Écaille » (Onyxia + Mont Hyjal, 10/12/2026 21:00);Pour le tank, principal",
      "C;Thom Leboss#1796900000#42;1;SR enregistrées.",
      "C;Ciel Gris#1796900100#7;0;Refusé, trop tard",
    ]);
  });

  it("keeps the separators of the format out of free text", () => {
    const typed = { ...facts, signups: [signup("c-thom", "Thom Leboss", { spec: "Sacré; Ombre\r\n" })], journal: [] };
    expect(formatAddonEvent(typed).split("\n")).toContain(
      "S;Thom Leboss;PRIEST;healer;present;0;Sacré, Ombre;20:20,21:0",
    );
  });
});
