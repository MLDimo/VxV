import { describe, expect, it } from "vitest";
import { formatAddonTitles } from "./addonTitles.ts";
import type { Character } from "./characters.ts";
import { TITLES } from "./titles.ts";

const character = (firstName: string, lastName: string, memberId: string): Character => ({
  id: `c-${firstName}`,
  firstName,
  lastName,
  characterClass: "WARRIOR",
  memberId,
  isMain: true,
  inGuild: true,
});

describe("titles for the addon", () => {
  it("writes every title of the week, with its holder or nobody, then those made by hand, after the head", () => {
    const vorn = character("Vorn", "Cendrelune", "m-vorn");
    const lines = formatAddonTitles({
      officers: [vorn],
      characters: [vorn, character("Sira", "Ventargent", "m-sira")],
      holders: [
        {
          titleId: "sugarDaddy",
          memberId: "m-vorn",
          memberName: "Vorn Cendrelune",
          memberClass: "WARRIOR",
          score: 500,
        },
        { titleId: "wellFed", memberId: "m-sira", memberName: "Sira Ventargent", memberClass: undefined, score: 3 },
      ],
      custom: [
        {
          id: "t1",
          name: "Sauveur du raid",
          reason: "A tenu Onyxia seul",
          memberId: "m-sira",
          memberName: "Sira Ventargent",
          memberClass: undefined,
        },
      ],
      exportedAt: new Date("2026-10-07T05:00:00Z"),
    }).split("\n");
    expect(lines.slice(0, 5)).toEqual([
      "VXV-TITRES-1",
      "P;1791349200",
      "O;Vorn Cendrelune",
      "M;m-vorn;Vorn Cendrelune",
      "M;m-sira;Sira Ventargent",
    ]);
    expect(lines.slice(5)).toHaveLength(TITLES.length + 1);
    // A title made by hand: its reason as its rule, no score.
    expect(lines.at(-1)).toBe("T;custom-t1;Sauveur du raid;A tenu Onyxia seul;m-sira;Sira Ventargent;;0");
    expect(lines).toContain(
      "T;wellFed;Bien gras;Le plus d'objets reçus en raid sur la saison.;m-sira;Sira Ventargent;;3",
    );
    expect(lines).toContain(
      "T;sugarDaddy;Sugar Daddy;Le plus gros donateur à la caisse de la guilde sur la saison.;m-vorn;Vorn Cendrelune;WARRIOR;500",
    );
    expect(lines).toContain("T;numberOne;Numéro UNO;Vainqueur de la dernière mission de guilde terminée.;;;;0");
  });
});
