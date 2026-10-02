import type { CharacterRepository } from "../../application/ports.ts";
import type { Character } from "../../domain/characters.ts";
import type { SqlClient } from "../sql.ts";

interface CharacterRow {
  id: string;
  first_name: string;
  last_name: string;
  class: string;
  member_id: string | null;
  is_main: boolean;
  in_guild: boolean;
}

function toCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    characterClass: row.class,
    memberId: row.member_id ?? undefined,
    isMain: row.is_main,
    inGuild: row.in_guild,
  };
}

export function characterRepository(sql: SqlClient): CharacterRepository {
  return {
    async listAll() {
      const rows = await sql.query<CharacterRow>(
        "select id, first_name, last_name, class, member_id, is_main, in_guild from characters",
      );
      return rows.map(toCharacter);
    },

    async add(entries) {
      if (entries.length === 0) {
        return;
      }
      await sql.query(
        `insert into characters (first_name, last_name, class)
         select * from unnest($1::text[], $2::text[], $3::text[])`,
        [
          entries.map((entry) => entry.firstName),
          entries.map((entry) => entry.lastName),
          entries.map((entry) => entry.characterClass),
        ],
      );
    },

    async changeClass(characterId, characterClass) {
      await sql.query("update characters set class = $2 where id = $1", [characterId, characterClass]);
    },

    async setInGuild(characterIds, inGuild) {
      if (characterIds.length === 0) {
        return;
      }
      await sql.query("update characters set in_guild = $2 where id = any($1::uuid[])", [characterIds, inGuild]);
    },
  };
}
