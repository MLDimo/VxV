import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AVATARS, avatarName } from "./avatars.ts";
import { ADDON_AVATARS, SITE_AVATARS } from "./files.ts";

describe("avatars", () => {
  it("takes the character's own portrait, else borrows the nearest one (§8)", () => {
    expect(avatarName("PRIEST", "Scourge", "female")).toBe("mv_pretre_f");
    // Same race and class, other sex.
    expect(avatarName("PRIEST", "Scourge", "male")).toBe("mv_pretre_f");
    // Same class, other race.
    expect(avatarName("ROGUE", "Orc", "male")).toBe("mv_voleur_m");
    expect(avatarName("MAGE")).toBe("troll_mage_m");
    // Same race, unknown class.
    expect(avatarName("DEATHKNIGHT", "Tauren", "male")).toBe("tauren_chasseur_f");
    expect(avatarName("DEATHKNIGHT")).toBeUndefined();
  });

  it("are the website's in the addon (npm run generate)", () => {
    for (const avatar of AVATARS) {
      expect(readFileSync(new URL(`${avatar}.png`, ADDON_AVATARS))).toEqual(
        readFileSync(new URL(`${avatar}.png`, SITE_AVATARS)),
      );
    }
  });
});
