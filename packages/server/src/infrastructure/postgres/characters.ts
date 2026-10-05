import type { CharacterRepository } from "../../application/ports.ts";
import type { Character } from "../../domain/characters.ts";
import type { SqlClient } from "../sql.ts";
import { isUuid } from "./uuid.ts";

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

const COLUMNS = "id, first_name, last_name, class, member_id, is_main, in_guild";

export function characterRepository(sql: SqlClient): CharacterRepository {
  const select = async (where: string, params: unknown[] = []) =>
    (await sql.query<CharacterRow>(`select ${COLUMNS} from characters ${where}`, params)).map(toCharacter);

  return {
    listAll() {
      return select("");
    },

    async findById(characterId) {
      if (!isUuid(characterId)) {
        return undefined;
      }
      const [character] = await select("where id = $1", [characterId]);
      return character;
    },

    listAvailable() {
      return select("where in_guild and member_id is null order by first_name, last_name");
    },

    listByMember(memberId) {
      return select("where member_id = $1 order by is_main desc, first_name, last_name", [memberId]);
    },

    async link(characterId, memberId) {
      await sql.query("update characters set member_id = $2 where id = $1", [characterId, memberId]);
    },

    async setAppearance(characterId, { race, sex }) {
      await sql.query("update characters set race = $2, sex = $3 where id = $1", [characterId, race, sex]);
    },

    async unlink(characterId) {
      await sql.query("update characters set member_id = null, is_main = false where id = $1", [characterId]);
    },

    async setMain(memberId, characterId) {
      // Two statements: the one-main-per-member index is checked row by row.
      await sql.query("update characters set is_main = false where member_id = $1 and is_main", [memberId]);
      await sql.query("update characters set is_main = true where id = $1 and member_id = $2", [characterId, memberId]);
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
