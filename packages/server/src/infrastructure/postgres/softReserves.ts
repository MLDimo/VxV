import type { SoftReserveRepository } from "../../application/ports.ts";
import { fullName } from "../../domain/characters.ts";
import type { SqlClient } from "../sql.ts";

interface SoftReserveRow {
  item_id: number;
  character_id: string;
  first_name: string;
  last_name: string;
  class: string;
}

export function softReserveRepository(sql: SqlClient): SoftReserveRepository {
  return {
    async listByEvent(eventId) {
      const rows = await sql.query<SoftReserveRow>(
        `select soft_reserves.item_id, soft_reserves.character_id, characters.first_name, characters.last_name,
                characters.class
         from soft_reserves join characters on characters.id = soft_reserves.character_id
         where soft_reserves.event_id = $1
         order by characters.first_name, characters.last_name`,
        [eventId],
      );
      return rows.map((row) => ({
        itemId: row.item_id,
        characterId: row.character_id,
        characterName: fullName({ firstName: row.first_name, lastName: row.last_name }),
        characterClass: row.class,
      }));
    },

    async replaceForCharacter(eventId, characterId, itemIds) {
      await sql.query("delete from soft_reserves where event_id = $1 and character_id = $2", [eventId, characterId]);
      await sql.query(
        `insert into soft_reserves (event_id, character_id, item_id)
         select $1, $2, unnest($3::int[])`,
        [eventId, characterId, itemIds],
      );
    },

    async deleteForItem(eventId, itemId) {
      await sql.query("delete from soft_reserves where event_id = $1 and item_id = $2", [eventId, itemId]);
    },
  };
}
