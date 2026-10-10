import { addonHead, line, seconds, text, type AddonReaders } from "./addonText.ts";
import type { Recipe } from "./artisans.ts";

/** First line of the artisans directory for the addon (contract with VXV/Artisans); the number is its version. */
export const ADDON_ARTISANS_HEADER = "VXV-ARTISANS-1";

const RECIPE_SEPARATOR = ",";

export interface AddonArtisansFacts extends AddonReaders {
  professions: readonly {
    characterId: string;
    characterName: string;
    characterClass: string;
    professionId: number;
    name: string;
    level: number;
    maxLevel: number;
    readAt: Date;
    recipesReadAt: Date | undefined;
  }[];
  recipes: readonly (Recipe & { professionId: number })[];
  known: readonly { characterId: string; professionId: number; recipeId: number }[];
}

/**
 * The artisans directory as the companion hands it to the addon, one record per line, after the head of every
 * bundle's data (addonHead: P, O and M):
 * A;character;class token;profession id;name;level;max level;read (Unix seconds);recipes read (0 while never read)
 * K;recipe id;profession id;name (the recipes the guild knows)
 * R;character;profession id;its known recipes' ids, separated by ","
 */
export function formatAddonArtisans(facts: AddonArtisansFacts): string {
  return [
    ...addonHead(ADDON_ARTISANS_HEADER, facts),
    ...facts.professions.map((profession) =>
      line(
        "A",
        profession.characterName,
        profession.characterClass,
        profession.professionId,
        text(profession.name),
        profession.level,
        profession.maxLevel,
        seconds(profession.readAt),
        profession.recipesReadAt === undefined ? 0 : seconds(profession.recipesReadAt),
      ),
    ),
    ...facts.recipes.map((recipe) => line("K", recipe.id, recipe.professionId, text(recipe.name))),
    ...facts.professions.flatMap((profession) => {
      const ids = facts.known
        .filter((item) => item.characterId === profession.characterId && item.professionId === profession.professionId)
        .map((item) => item.recipeId);
      return ids.length === 0
        ? []
        : [line("R", profession.characterName, profession.professionId, ids.join(RECIPE_SEPARATOR))];
    }),
  ].join("\n");
}
