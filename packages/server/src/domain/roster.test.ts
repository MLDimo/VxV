import { describe, expect, it } from "vitest";
import type { Character } from "./characters.ts";
import { parseRoster, planRosterImport, ROSTER_HEADER, RosterFormatError, summarizeRosterImport } from "./roster.ts";

function problemsOf(text: string): readonly string[] {
  try {
    parseRoster(text);
  } catch (error) {
    if (error instanceof RosterFormatError) {
      return error.problems;
    }
    throw error;
  }
  throw new Error("expected the roster to be rejected");
}

describe("parseRoster", () => {
  it("reads one character per line under the header", () => {
    expect(parseRoster(`${ROSTER_HEADER}\nÐéjà;Vu;ROGUE\nEole;Hermes;WARRIOR\n`)).toEqual([
      { firstName: "Ðéjà", lastName: "Vu", characterClass: "ROGUE" },
      { firstName: "Eole", lastName: "Hermes", characterClass: "WARRIOR" },
    ]);
  });

  it("accepts Windows line endings, blank lines and surrounding spaces", () => {
    expect(parseRoster(`\r\n  ${ROSTER_HEADER}  \r\n\r\n Ðéjà ; Vu ; ROGUE \r\n`)).toEqual([
      { firstName: "Ðéjà", lastName: "Vu", characterClass: "ROGUE" },
    ]);
  });

  it("requires the header", () => {
    expect(problemsOf("Ðéjà;Vu;ROGUE")).toEqual([expect.stringContaining(ROSTER_HEADER)]);
  });

  it("reports every wrong line with its number", () => {
    const text = [
      ROSTER_HEADER,
      "Ðéjà;Vu;ROGUE",
      "Eole;WARRIOR",
      "Ugly;Hole;Prêtre",
      "Ðéjà;Vu;ROGUE",
      ";Nom;MAGE",
    ].join("\n");
    expect(problemsOf(text)).toEqual([
      "Ligne 3 : format attendu Prénom;Nom;CLASSE.",
      "Ligne 4 : classe inconnue « Prêtre ».",
      "Ligne 5 : Ðéjà Vu apparaît deux fois.",
      "Ligne 6 : format attendu Prénom;Nom;CLASSE.",
    ]);
  });

  it("refuses an empty roster", () => {
    expect(problemsOf(ROSTER_HEADER)).toEqual(["La liste ne contient aucun personnage."]);
  });
});

function character(firstName: string, lastName: string, overrides: Partial<Character> = {}): Character {
  return {
    id: `${firstName}-${lastName}`,
    firstName,
    lastName,
    characterClass: "ROGUE",
    memberId: undefined,
    isMain: false,
    inGuild: true,
    ...overrides,
  };
}

describe("planRosterImport", () => {
  const roster = [
    { firstName: "Ðéjà", lastName: "Vu", characterClass: "ROGUE" },
    { firstName: "Eole", lastName: "Hermes", characterClass: "WARRIOR" },
    { firstName: "Suis", lastName: "Surtescotes", characterClass: "MAGE" },
  ];

  it("adds unknown characters", () => {
    const plan = planRosterImport([], roster);
    expect(plan.added).toEqual(roster);
    expect([plan.classChanged, plan.left, plan.rejoined]).toEqual([[], [], []]);
  });

  it("detects class changes, departures and returns", () => {
    const deja = character("Ðéjà", "Vu");
    const eole = character("Eole", "Hermes", { characterClass: "PALADIN" });
    const suis = character("Suis", "Surtescotes", { characterClass: "MAGE", inGuild: false });
    const ugly = character("Ugly", "Hole");
    const gone = character("Long", "Gone", { inGuild: false });
    const plan = planRosterImport([deja, eole, suis, ugly, gone], roster);
    expect(plan).toEqual({
      added: [],
      classChanged: [{ character: eole, characterClass: "WARRIOR" }],
      left: [ugly],
      rejoined: [suis],
    });
  });

  it("summarizes the plan with character names", () => {
    const plan = planRosterImport([character("Ugly", "Hole")], roster);
    expect(summarizeRosterImport(plan, roster.length)).toEqual({
      added: ["Ðéjà Vu", "Eole Hermes", "Suis Surtescotes"],
      left: ["Ugly Hole"],
      rejoined: [],
      classChanged: [],
      inGuild: 3,
    });
  });
});
