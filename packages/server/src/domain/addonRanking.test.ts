import { describe, expect, it } from "vitest";
import { formatAddonRanking } from "./addonRanking.ts";

const EXPORTED = new Date("2026-12-10T07:00:00Z");

describe("Ranking's data for the addon", () => {
  it("writes each board with its first places and records, and the members it shows once", () => {
    const text = formatAddonRanking({
      officers: [],
      characters: [],
      exportedAt: EXPORTED,
      seasonNumber: 2,
      members: [
        {
          memberId: "m-vorn",
          name: "Vorn Cendrelune",
          characterClass: "WARRIOR",
          avatar: "orc_guerrier_m",
          title: "Roi du gambling",
        },
        {
          memberId: "m-sira",
          name: "Sira; Ventargent",
          characterClass: undefined,
          avatar: undefined,
          title: undefined,
        },
        { memberId: "m-absent", name: "Personne", characterClass: undefined, avatar: undefined, title: undefined },
      ],
      boards: [
        {
          category: "paris",
          period: "season",
          metric: "gain net",
          unit: "gold",
          rows: [
            { rank: 1, memberId: "m-vorn", value: 3215 },
            { rank: 2, memberId: "m-sira", value: -120 },
          ],
          records: [{ label: "Plus gros gain", value: "+900 po", memberId: "m-vorn" }],
        },
      ],
    });
    expect(text.split("\n").slice(2)).toEqual([
      "S;2",
      "U;m-vorn;Vorn Cendrelune;WARRIOR;orc_guerrier_m;Roi du gambling",
      "U;m-sira;Sira, Ventargent;;;",
      "B;paris;season;gain net;gold",
      "R;paris;season;1;m-vorn;3215",
      "R;paris;season;2;m-sira;-120",
      "D;paris;season;Plus gros gain;+900 po;m-vorn",
    ]);
    expect(text.split("\n")[0]).toBe("VXV-RANKING-1");
  });
});
