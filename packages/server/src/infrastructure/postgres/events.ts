import type { EventRepository } from "../../application/ports.ts";
import type { RaidEvent, RaidSummary } from "../../domain/events.ts";
import type { SqlClient } from "../sql.ts";
import { expectRow } from "./rows.ts";
import { isUuid } from "./uuid.ts";

interface EventRow {
  id: string;
  starts_at: Date;
  soft_reserves_per_player: number;
  raids: RaidSummary[];
  discord_message_id: string | null;
}

const SELECT_EVENTS = `
  select events.id, events.starts_at, events.soft_reserves_per_player, events.discord_message_id,
         coalesce(json_agg(json_build_object('id', raids.id, 'name', raids.name) order by raids.name)
                  filter (where raids.id is not null), '[]') as raids
  from events
  left join event_raids on event_raids.event_id = events.id
  left join raids on raids.id = event_raids.raid_id`;

function toEvent(row: EventRow): RaidEvent {
  return {
    id: row.id,
    startsAt: row.starts_at,
    softReservesPerPlayer: row.soft_reserves_per_player,
    raids: row.raids,
    discordMessageId: row.discord_message_id ?? undefined,
  };
}

export function eventRepository(sql: SqlClient): EventRepository {
  return {
    async create(event, createdBy) {
      const rows = await sql.query<{ id: string }>(
        "insert into events (starts_at, soft_reserves_per_player, created_by) values ($1, $2, $3) returning id",
        [event.startsAt, event.softReservesPerPlayer, createdBy],
      );
      const { id } = expectRow(rows, "create event");
      await sql.query("insert into event_raids (event_id, raid_id) select $1, unnest($2::text[])", [id, event.raidIds]);
      return id;
    },

    async findById(eventId) {
      if (!isUuid(eventId)) {
        return undefined;
      }
      const [row] = await sql.query<EventRow>(`${SELECT_EVENTS} where events.id = $1 group by events.id`, [eventId]);
      return row && toEvent(row);
    },

    async setDiscordMessage(eventId, messageId) {
      await sql.query("update events set discord_message_id = $2 where id = $1", [eventId, messageId]);
    },

    async listToRemind(from, until) {
      const rows = await sql.query<EventRow>(
        `${SELECT_EVENTS} where events.starts_at > $1 and events.starts_at <= $2 and events.reminded_at is null
         group by events.id order by events.starts_at`,
        [from, until],
      );
      return rows.map(toEvent);
    },

    async markReminded(eventId, at) {
      await sql.query("update events set reminded_at = $2 where id = $1", [eventId, at]);
    },

    async listStartingAfter(instant) {
      const rows = await sql.query<EventRow>(
        `${SELECT_EVENTS} where events.starts_at > $1 group by events.id order by events.starts_at`,
        [instant],
      );
      return rows.map(toEvent);
    },
  };
}
