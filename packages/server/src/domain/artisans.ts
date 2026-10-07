import { instant, readRecords, requireRecord, wholeNumber } from "./textFormat.ts";

/**
 * The artisans directory (P14): a character's professions as the addon reads them in game, the level at each login
 * and the known recipes when the player opens a profession's window.
 */

/** First line of a character's professions sent by the addon (contract with VXV_Artisans); the version follows. */
export const PROFESSIONS_HEADER = "VXV-METIERS-1";

export interface Recipe {
  id: number;
  name: string;
}

/** A profession as read in game: its level, and its recipes once its window was opened. */
export interface ProfessionReading {
  /** The game's skill line (182 Herboristerie, 129 Secourisme…). */
  professionId: number;
  name: string;
  level: number;
  maxLevel: number;
  readAt: Date;
  /** The known recipes and when they were read; undefined while the profession's window was never opened. */
  recipes: { readAt: Date; list: Recipe[] } | undefined;
}

export interface CharacterProfessions {
  /** "Prénom Nom". */
  character: string;
  professions: ProfessionReading[];
}

/**
 * Reads a character's professions, one record per line:
 * C;character
 * P;profession id;name;level;max level;read (Unix seconds);recipes read (Unix seconds, 0 while never read)
 * R;profession id;recipe id;name (the known recipes of a profession whose recipes were read)
 * Lines of an unknown kind are skipped.
 */
export function parseProfessions(text: string): CharacterProfessions {
  let character: string | undefined;
  const professions: ProfessionReading[] = [];
  const byId = new Map<number, ProfessionReading>();
  readRecords(text, {
    headers: [PROFESSIONS_HEADER],
    wrongHeader: `Les métiers doivent commencer par la ligne ${PROFESSIONS_HEADER}.`,
    readers: {
      C: ([name]) => {
        character = name || undefined;
        return character !== undefined;
      },
      P: ([id, name, level, maxLevel, readAt, recipesReadAt]) => {
        const professionId = wholeNumber(id);
        const reading = {
          level: wholeNumber(level),
          maxLevel: wholeNumber(maxLevel),
          readAt: instant(readAt),
          recipesReadAt: recipesReadAt === "0" ? null : instant(recipesReadAt),
        };
        if (
          professionId === undefined ||
          professionId === 0 ||
          !name ||
          reading.level === undefined ||
          reading.maxLevel === undefined ||
          reading.readAt === undefined ||
          reading.recipesReadAt === undefined
        ) {
          return false;
        }
        const profession: ProfessionReading = {
          professionId,
          name,
          level: reading.level,
          maxLevel: reading.maxLevel,
          readAt: reading.readAt,
          recipes: reading.recipesReadAt === null ? undefined : { readAt: reading.recipesReadAt, list: [] },
        };
        professions.push(profession);
        byId.set(professionId, profession);
        return true;
      },
      R: ([professionId, recipeId, name]) => {
        const recipes = byId.get(wholeNumber(professionId) ?? 0)?.recipes;
        const id = wholeNumber(recipeId);
        if (recipes === undefined || id === undefined || id === 0 || !name) {
          return false;
        }
        recipes.list.push({ id, name });
        return true;
      },
    },
  });
  return {
    character: requireRecord(character, "Les métiers ne disent pas de quel personnage il s'agit (ligne C manquante)."),
    professions,
  };
}

/** A text as searched: lowercase, without accents nor extra spaces ("Œufs aux herbes" and "oeufs aux herbes" match). */
export function foldText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/œ/giu, "oe")
    .replace(/æ/giu, "ae")
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

/** Whether a name answers a search: it holds every word searched, accents and case aside. */
export function matchesSearch(search: string, name: string): boolean {
  const words = foldText(search)
    .split(" ")
    .filter((word) => word !== "");
  const folded = foldText(name);
  return words.length > 0 && words.every((word) => folded.includes(word));
}
