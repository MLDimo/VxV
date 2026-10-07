import { describe, expect, it } from "vitest";
import { formatAddonEventRoles } from "./addonEventRoles.ts";
import type { Character } from "./characters.ts";

const officer: Character = {
  id: "c-officer",
  firstName: "Ðéjà",
  lastName: "Vu",
  characterClass: "ROGUE",
  memberId: "m-officer",
  isMain: true,
  inGuild: true,
};

describe("formatAddonEventRoles", () => {
  it("writes the common head, then each role an event may be reserved to", () => {
    const text = formatAddonEventRoles(
      [
        { id: "guild", name: "Tout le monde", everyone: true },
        { id: "1194373648929263676", name: "Raideur R1; R2", everyone: false },
      ],
      { officers: [officer], characters: [officer], exportedAt: new Date("2026-12-01T12:00:00Z") },
    );
    expect(text.split("\n")).toEqual([
      "VXV-ROLES-1",
      "P;1796126400",
      "O;Ðéjà Vu",
      "M;m-officer;Ðéjà Vu",
      "R;guild;Tout le monde",
      "R;1194373648929263676;Raideur R1, R2",
    ]);
  });
});
