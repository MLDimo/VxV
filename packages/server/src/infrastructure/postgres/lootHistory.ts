import type { LootHistoryRepository } from "../../application/ports.ts";
import type { LootMethod, LootRecord } from "../../domain/history.ts";
import type { SqlClient } from "../sql.ts";

interface LootRow {
  event_id: string;
  starts_at: Date;
  raids: string[];
  boss_name: string;
  item_name: string;
  winner_name: string;
  winner_class: string;
  looted_at: Date;
  method: LootMethod;
  soft_reserved_by: string[];
}

export function lootHistoryRepository(sql: SqlClient): LootHistoryRepository {
  return {
    async countSignedUpOwners(eventId) {
      const rows = await sql.query<{ item_id: number; owners: number }>(
        `select loots.item_id, count(distinct loots.character_id)::int as owners
         from loots
         join signups on signups.character_id = loots.character_id and signups.event_id = $1
         group by loots.item_id`,
        [eventId],
      );
      return new Map(rows.map((row) => [row.item_id, row.owners]));
    },

    async list(limit, methods) {
      const rows = await sql.query<LootRow>(
        `select loots.event_id, events.starts_at,
                array(select raids.name from event_raids join raids on raids.id = event_raids.raid_id
                      where event_raids.event_id = loots.event_id order by raids.name) as raids,
                bosses.name as boss_name, items.name as item_name,
                winner.first_name || ' ' || winner.last_name as winner_name, winner.class as winner_class,
                loots.looted_at, loots.method,
                array(select characters.first_name || ' ' || characters.last_name from soft_reserves
                      join characters on characters.id = soft_reserves.character_id
                      where soft_reserves.event_id = loots.event_id and soft_reserves.item_id = loots.item_id
                      order by characters.first_name, characters.last_name) as soft_reserved_by
         from loots
         join events on events.id = loots.event_id
         join bosses on bosses.encounter_id = loots.encounter_id
         join items on items.id = loots.item_id
         join characters as winner on winner.id = loots.character_id
         where loots.method = any($2::text[]::loot_method[])
         order by loots.looted_at desc
         limit $1`,
        [limit, methods],
      );
      return rows.map((row): LootRecord => ({
        eventId: row.event_id,
        eventStartsAt: row.starts_at,
        raids: row.raids,
        bossName: row.boss_name,
        itemName: row.item_name,
        winnerName: row.winner_name,
        winnerClass: row.winner_class,
        lootedAt: row.looted_at,
        method: row.method,
        softReservedBy: row.soft_reserved_by,
      }));
    },
  };
}
