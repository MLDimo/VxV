import type { ArtisanProfession, KnownRecipe, ProfessionRepository } from "../../application/ports.ts";
import type { Recipe } from "../../domain/artisans.ts";
import type { SqlClient } from "../sql.ts";

interface ProfessionRow {
  character_id: string;
  first_name: string;
  last_name: string;
  class: string;
  member_id: string | null;
  profession_id: number;
  name: string;
  skill_level: number;
  max_level: number;
  read_at: Date;
  recipes_read_at: Date | null;
}

export function professionRepository(sql: SqlClient): ProfessionRepository {
  return {
    async save(characterId, reading, sentBy) {
      // The level, when read later than the known one (a new profession's row comes with it).
      const level = await sql.query(
        `insert into professions (character_id, profession_id, name, skill_level, max_level, read_at, sent_by)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (character_id, profession_id) do update
           set name = excluded.name, skill_level = excluded.skill_level, max_level = excluded.max_level,
               read_at = excluded.read_at, sent_by = excluded.sent_by
           where professions.read_at < excluded.read_at
         returning profession_id`,
        [characterId, reading.professionId, reading.name, reading.level, reading.maxLevel, reading.readAt, sentBy],
      );
      const recipes = reading.recipes;
      if (recipes === undefined) {
        return level.length > 0;
      }
      // The recipes, when read later than the known ones: they replace them.
      const newer = await sql.query(
        `update professions set recipes_read_at = $3
         where character_id = $1 and profession_id = $2 and (recipes_read_at is null or recipes_read_at < $3)
         returning profession_id`,
        [characterId, reading.professionId, recipes.readAt],
      );
      if (newer.length === 0) {
        return level.length > 0;
      }
      await sql.query(
        `insert into recipes (id, profession_id, name)
         select id, $1, name from unnest($2::integer[], $3::text[]) as recipe(id, name)
         on conflict (id) do update set name = excluded.name, profession_id = excluded.profession_id`,
        [reading.professionId, recipes.list.map((recipe) => recipe.id), recipes.list.map((recipe) => recipe.name)],
      );
      await sql.query("delete from known_recipes where character_id = $1 and profession_id = $2", [
        characterId,
        reading.professionId,
      ]);
      await sql.query(
        `insert into known_recipes (character_id, profession_id, recipe_id)
         select $1, $2, unnest($3::integer[])`,
        [characterId, reading.professionId, recipes.list.map((recipe) => recipe.id)],
      );
      return true;
    },

    async listAll(): Promise<ArtisanProfession[]> {
      const rows = await sql.query<ProfessionRow>(
        `select professions.character_id, characters.first_name, characters.last_name, characters.class,
                characters.member_id, professions.profession_id, professions.name, professions.skill_level,
                professions.max_level, professions.read_at, professions.recipes_read_at
         from professions join characters on characters.id = professions.character_id
         where characters.in_guild
         order by professions.name, professions.skill_level desc, characters.first_name, characters.last_name`,
      );
      return rows.map((row) => ({
        characterId: row.character_id,
        characterName: `${row.first_name} ${row.last_name}`,
        characterClass: row.class,
        memberId: row.member_id ?? undefined,
        professionId: row.profession_id,
        name: row.name,
        level: row.skill_level,
        maxLevel: row.max_level,
        readAt: row.read_at,
        recipesReadAt: row.recipes_read_at ?? undefined,
      }));
    },

    async listRecipes(): Promise<(Recipe & { professionId: number })[]> {
      const rows = await sql.query<{ id: number; profession_id: number; name: string }>(
        "select id, profession_id, name from recipes order by name",
      );
      return rows.map((row) => ({ id: row.id, professionId: row.profession_id, name: row.name }));
    },

    async listKnown(): Promise<KnownRecipe[]> {
      const rows = await sql.query<{ character_id: string; profession_id: number; recipe_id: number }>(
        `select known_recipes.character_id, known_recipes.profession_id, known_recipes.recipe_id
         from known_recipes join characters on characters.id = known_recipes.character_id
         where characters.in_guild`,
      );
      return rows.map((row) => ({
        characterId: row.character_id,
        professionId: row.profession_id,
        recipeId: row.recipe_id,
      }));
    },
  };
}
