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

    async replaceForCharacter(eventId, characterId, itemIds, changedAt) {
      await sql.query("delete from soft_reserves where event_id = $1 and character_id = $2", [eventId, characterId]);
      await sql.query("update signups set reserves_updated_at = $3 where event_id = $1 and character_id = $2", [
        eventId,
        characterId,
        changedAt,
      ]);
      await sql.query(
        `insert into soft_reserves (event_id, character_id, item_id)
         select $1, $2, unnest($3::int[])`,
        [eventId, characterId, itemIds],
      );
    },

    async deleteForItem(eventId, itemId) {
      await sql.query("delete from soft_reserves where event_id = $1 and item_id = $2", [eventId, itemId]);
    },

    async listPrevious(eventId) {
      const rows = await sql.query<{ character_id: string; item_id: number }>(
        `with raids_of as (
           select event_id, array_agg(raid_id order by raid_id) as raids from event_raids group by event_id
         ),
         latest as (
           select distinct on (signups.character_id) signups.character_id, past.id as event_id
           from signups
           join events as current on current.id = signups.event_id
           join raids_of as current_raids on current_raids.event_id = current.id
           join events as past on past.starts_at < current.starts_at
           join raids_of as past_raids on past_raids.event_id = past.id and past_raids.raids = current_raids.raids
           where signups.event_id = $1
             and exists (select 1 from soft_reserves
                         where soft_reserves.event_id = past.id and soft_reserves.character_id = signups.character_id)
           order by signups.character_id, past.starts_at desc, past.id
         )
         select latest.character_id, soft_reserves.item_id
         from latest
         join soft_reserves on soft_reserves.event_id = latest.event_id
                           and soft_reserves.character_id = latest.character_id
         where not exists (select 1 from loots
                           where loots.character_id = latest.character_id and loots.item_id = soft_reserves.item_id)
         order by latest.character_id, soft_reserves.created_at, soft_reserves.item_id`,
        [eventId],
      );
      const previous = new Map<string, number[]>();
      for (const row of rows) {
        previous.set(row.character_id, [...(previous.get(row.character_id) ?? []), row.item_id]);
      }
      return previous;
    },
  };
}
