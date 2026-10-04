import type { LootHistoryRepository } from "../../application/ports.ts";
import type { LootMethod, LootRecord } from "../../domain/history.ts";
import { reserveKey, type PastEventForItem } from "../../domain/softReserves.ts";
import type { SqlClient } from "../sql.ts";
import { isUuid } from "./uuid.ts";

interface LootRow {
  id: string;
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

interface PastEventRow {
  character_id: string;
  item_id: number;
  drops_item: boolean;
  present: boolean;
  reserved: boolean;
  obtained: boolean;
}

const SELECT_LOOTS = `
  select loots.id::text as id, loots.event_id, events.starts_at,
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
  join characters as winner on winner.id = loots.character_id`;

function toRecord(row: LootRow): LootRecord {
  return {
    id: row.id,
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
  };
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
        `${SELECT_LOOTS} where loots.method = any($2::text[]::loot_method[])
         order by loots.looted_at desc
         limit $1`,
        [limit, methods],
      );
      return rows.map(toRecord);
    },

    async findById(lootId) {
      if (!isUuid(lootId)) {
        return undefined;
      }
      const [row] = await sql.query<LootRow>(`${SELECT_LOOTS} where loots.id = $1`, [lootId]);
      return row && toRecord(row);
    },

    async correct(lootId, characterId, method) {
      await sql.query("update loots set character_id = $2, method = $3::text::loot_method where id = $1", [
        lootId,
        characterId,
        method,
      ]);
    },

    async pastEventsForReserves(eventId) {
      const rows = await sql.query<PastEventRow>(
        `select reserve.character_id, reserve.item_id,
                exists (select 1 from event_raids
                        join bosses on bosses.raid_id = event_raids.raid_id
                        join boss_loot on boss_loot.encounter_id = bosses.encounter_id
                        where event_raids.event_id = past.id and boss_loot.item_id = reserve.item_id) as drops_item,
                exists (select 1 from event_attendance
                        where event_attendance.event_id = past.id
                          and event_attendance.character_id = reserve.character_id) as present,
                exists (select 1 from soft_reserves
                        where soft_reserves.event_id = past.id and soft_reserves.character_id = reserve.character_id
                          and soft_reserves.item_id = reserve.item_id) as reserved,
                exists (select 1 from loots
                        where loots.event_id = past.id and loots.character_id = reserve.character_id
                          and loots.item_id = reserve.item_id) as obtained
         from soft_reserves as reserve
         join events as current on current.id = reserve.event_id
         join events as past on past.starts_at < current.starts_at
         where reserve.event_id = $1
         order by past.starts_at desc, past.id`,
        [eventId],
      );
      const pastEvents = new Map<string, PastEventForItem[]>();
      for (const row of rows) {
        const key = reserveKey(row.character_id, row.item_id);
        const history = pastEvents.get(key) ?? [];
        history.push({
          dropsItem: row.drops_item,
          present: row.present,
          reserved: row.reserved,
          obtained: row.obtained,
        });
        pastEvents.set(key, history);
      }
      return pastEvents;
    },
  };
}
