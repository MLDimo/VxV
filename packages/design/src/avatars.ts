/**
 * The pixel portraits (docs/design/VXV_Design_Spec.md §8), named race_class_sex: every combination of the Horde's
 * races, classes and sexes (undead paladins included). A character the addon did not describe borrows the nearest:
 * same race and class, then same class, then same race.
 */
export const AVATARS = [
  "mv_demoniste_f",
  "mv_demoniste_m",
  "mv_guerrier_f",
  "mv_guerrier_m",
  "mv_mage_f",
  "mv_mage_m",
  "mv_paladin_f",
  "mv_paladin_m",
  "mv_pretre_f",
  "mv_pretre_m",
  "mv_voleur_f",
  "mv_voleur_m",
  "orc_chaman_f",
  "orc_chaman_m",
  "orc_chasseur_f",
  "orc_chasseur_m",
  "orc_demoniste_f",
  "orc_demoniste_m",
  "orc_guerrier_f",
  "orc_guerrier_m",
  "orc_voleur_f",
  "orc_voleur_m",
  "tauren_chaman_f",
  "tauren_chaman_m",
  "tauren_chasseur_f",
  "tauren_chasseur_m",
  "tauren_druide_f",
  "tauren_druide_m",
  "tauren_guerrier_f",
  "tauren_guerrier_m",
  "troll_chaman_f",
  "troll_chaman_m",
  "troll_chasseur_f",
  "troll_chasseur_m",
  "troll_guerrier_f",
  "troll_guerrier_m",
  "troll_mage_f",
  "troll_mage_m",
  "troll_pretre_f",
  "troll_pretre_m",
  "troll_voleur_f",
  "troll_voleur_m",
] as const;

/** The game's race tokens (UnitRace) and class tokens, as the portraits' names write them. */
const RACES: Readonly<Record<string, string>> = { Scourge: "mv", Orc: "orc", Tauren: "tauren", Troll: "troll" };
const CLASSES: Readonly<Record<string, string>> = {
  WARRIOR: "guerrier",
  PALADIN: "paladin",
  HUNTER: "chasseur",
  ROGUE: "voleur",
  PRIEST: "pretre",
  SHAMAN: "chaman",
  MAGE: "mage",
  WARLOCK: "demoniste",
  DRUID: "druide",
};
const SEXES = { male: "m", female: "f" } as const;

/** The portrait of a character (class token, and race and sex when the addon told them), or undefined. */
export function avatarName(
  characterClass: string,
  race?: string,
  sex?: keyof typeof SEXES,
): (typeof AVATARS)[number] | undefined {
  const raceName = race === undefined ? undefined : RACES[race];
  const className = CLASSES[characterClass];
  const parts = (name: string) => name.split("_");
  const candidates: ((name: string) => boolean)[] = [
    (name) => name === `${raceName ?? ""}_${className ?? ""}_${sex === undefined ? "" : SEXES[sex]}`,
    (name) => parts(name)[0] === raceName && parts(name)[1] === className,
    (name) => parts(name)[1] === className,
    (name) => parts(name)[0] === raceName,
  ];
  for (const matches of candidates) {
    const found = AVATARS.find(matches);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}
