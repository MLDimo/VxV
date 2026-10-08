import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AVATARS, avatarName } from "./avatars.ts";
import { ADDON_AVATARS, SITE_AVATARS } from "./files.ts";

describe("avatars", () => {
  it("has every combination of the Horde's races, classes and sexes", () => {
    const horde = {
      mv: ["demoniste", "guerrier", "mage", "paladin", "pretre", "voleur"],
      orc: ["chaman", "chasseur", "demoniste", "guerrier", "voleur"],
      tauren: ["chaman", "chasseur", "druide", "guerrier"],
      troll: ["chaman", "chasseur", "guerrier", "mage", "pretre", "voleur"],
    };
    const all = Object.entries(horde).flatMap(([race, classes]) =>
      classes.flatMap((name) => [`${race}_${name}_f`, `${race}_${name}_m`]),
    );
    expect([...AVATARS].sort()).toEqual(all.sort());
  });

  it("takes the character's own portrait, else borrows the nearest one (§8)", () => {
    expect(avatarName("PRIEST", "Scourge", "female")).toBe("mv_pretre_f");
    expect(avatarName("PRIEST", "Scourge", "male")).toBe("mv_pretre_m");
    expect(avatarName("ROGUE", "Orc", "female")).toBe("orc_voleur_f");
    // Without the sex: same race and class.
    expect(avatarName("DRUID", "Tauren")).toBe("tauren_druide_f");
    // Without the race: same class.
    expect(avatarName("MAGE")).toBe("mv_mage_f");
    // An unknown class: same race.
    expect(avatarName("DEATHKNIGHT", "Tauren", "male")).toBe("tauren_chaman_f");
    expect(avatarName("DEATHKNIGHT")).toBeUndefined();
  });

  it("are the website's in the addon (npm run generate)", () => {
    // Buffer.equals: a deep comparison of each image's bytes takes seconds.
    const different = AVATARS.filter(
      (avatar) =>
        !readFileSync(new URL(`${avatar}.png`, ADDON_AVATARS)).equals(
          readFileSync(new URL(`${avatar}.png`, SITE_AVATARS)),
        ),
    );
    expect(different).toEqual([]);
  });
});
