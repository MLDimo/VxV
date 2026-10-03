import { describe, expect, it } from "vitest";
import type { Character } from "./characters.ts";
import { linkRefusal, ownershipRefusal } from "./characterLinks.ts";

const character: Character = {
  id: "c",
  firstName: "Ðéjà",
  lastName: "Vu",
  characterClass: "ROGUE",
  memberId: undefined,
  isMain: false,
  inGuild: true,
};

describe("linkRefusal", () => {
  it("lets a member claim a free guild character, or one already theirs", () => {
    expect(linkRefusal(character, "me")).toBeUndefined();
    expect(linkRefusal({ ...character, memberId: "me" }, "me")).toBeUndefined();
  });

  it.each([
    ["an unknown character", undefined, /introuvable/],
    ["a character outside the guild", { ...character, inGuild: false }, /ne fait pas partie de la guilde/],
    ["a character of another member", { ...character, memberId: "other" }, /déjà lié à un autre membre/],
  ])("refuses %s", (_case, candidate, message) => {
    expect(linkRefusal(candidate, "me")).toMatch(message);
  });
});

describe("ownershipRefusal", () => {
  it("accepts the member's own character only", () => {
    expect(ownershipRefusal({ ...character, memberId: "me" }, "me")).toBeUndefined();
    expect(ownershipRefusal({ ...character, memberId: "other" }, "me")).toMatch(/ne vous appartient pas/);
    expect(ownershipRefusal(character, "me")).toMatch(/ne vous appartient pas/);
    expect(ownershipRefusal(undefined, "me")).toMatch(/ne vous appartient pas/);
  });
});
