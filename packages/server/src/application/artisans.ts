import { matchesSearch, parseProfessions, type Recipe } from "../domain/artisans.ts";
import { fullName } from "../domain/characters.ts";
import type { Member } from "../domain/members.ts";
import { canManageRaids } from "../domain/permissions.ts";
import type { ArtisanProfession, UnitOfWork } from "./ports.ts";

/** How many recipes a search shows at most: a word too short would list the whole directory. */
const SEARCH_RESULTS = 30;

/** A recipe found, with the characters who know it, by their profession. */
export interface RecipeFound {
  recipe: Recipe & { professionId: number };
  crafters: ArtisanProfession[];
}

/** The artisans directory (P14): who can make what in the guild, read in game by the addon. */
export function createArtisans({ unitOfWork }: { unitOfWork: UnitOfWork }) {
  return {
    /**
     * Professions sent by a companion (P14.2), one VXV-METIERS text per character: the member's own characters, and
     * for an officer those of the guild relayed in game. Returns how many professions changed; a text that cannot be
     * read throws its problems.
     */
    async recordFromGame(sender: Member, texts: readonly string[]): Promise<number> {
      const readings = texts.map(parseProfessions);
      return unitOfWork.run(async ({ characters, professions }) => {
        const byName = new Map((await characters.listAll()).map((character) => [fullName(character), character]));
        const relay = canManageRaids(sender.roles);
        let changed = 0;
        for (const { character: name, professions: read } of readings) {
          const character = byName.get(name);
          if (character === undefined || !(character.memberId === sender.id || (relay && character.inGuild))) {
            continue;
          }
          for (const reading of read) {
            changed += (await professions.save(character.id, reading, sender.id)) ? 1 : 0;
          }
        }
        return changed;
      });
    },

    /** Every profession of the guild's characters, by profession then level. */
    directory(): Promise<ArtisanProfession[]> {
      return unitOfWork.run(({ professions }) => professions.listAll());
    },

    /** « Qui peut fabriquer… ? » (P14.3): the recipes whose name holds every word, with who knows them. */
    async search(text: string): Promise<RecipeFound[]> {
      return unitOfWork.run(async ({ professions }) => {
        const recipes = (await professions.listRecipes()).filter((recipe) => matchesSearch(text, recipe.name));
        const shown = recipes.slice(0, SEARCH_RESULTS);
        const entries = await professions.listAll();
        const known = await professions.listKnown();
        return shown.map((recipe) => ({
          recipe,
          crafters: entries.filter((entry) =>
            known.some(
              (item) =>
                item.recipeId === recipe.id &&
                item.characterId === entry.characterId &&
                item.professionId === entry.professionId,
            ),
          ),
        }));
      });
    },
  };
}
