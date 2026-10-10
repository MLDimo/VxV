import type { EventRepository } from "../../application/ports.ts";
import type { EventKind, GuildEvent, RaidSummary } from "../../domain/events.ts";
import type { SqlClient } from "../sql.ts";
import { expectRow } from "./rows.ts";
import { isUuid } from "./uuid.ts";

interface EventRow {
  id: string;
  kind: EventKind;
  title: string | null;
  starts_at: Date;
  soft_reserves_per_player: number;
  raids: RaidSummary[];
  role_id: string | null;
  role_name: string | null;
  discord_message_id: string | null;
}

const SELECT_EVENTS = `
  select events.id, events.kind, events.title, events.starts_at, events.soft_reserves_per_player, events.role_id, events.role_name,
         events.discord_message_id,
         coalesce(json_agg(json_build_object('id', raids.id, 'name', raids.name) order by raids.name)
                  filter (where raids.id is not null), '[]') as raids
  from events
  left join event_raids on event_raids.event_id = events.id
  left join raids on raids.id = event_raids.raid_id`;

function toEvent(row: EventRow): GuildEvent {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title ?? undefined,
    startsAt: row.starts_at,
    softReservesPerPlayer: row.soft_reserves_per_player,
    raids: row.raids,
    role: row.role_id === null || row.role_name === null ? undefined : { id: row.role_id, name: row.role_name },
    discordMessageId: row.discord_message_id ?? undefined,
  };
}

export function eventRepository(sql: SqlClient): EventRepository {
  return {
    async create(event, createdBy) {
      const rows = await sql.query<{ id: string }>(
        `insert into events (kind, title, starts_at, soft_reserves_per_player, role_id, role_name, created_by)
         values ($1, $2, $3, $4, $5, $6, $7) returning id`,
        [
          event.kind,
          event.title ?? null,
          event.startsAt,
          event.softReservesPerPlayer,
          event.role?.id ?? null,
          event.role?.name ?? null,
          createdBy,
        ],
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

    async listSoftReservesToRemind(from, until) {
      const rows = await sql.query<EventRow>(
        `${SELECT_EVENTS} where events.starts_at > $1 and events.starts_at <= $2
           and events.soft_reserves_reminded_at is null and events.kind = 'raid'
           and events.soft_reserves_per_player > 0
         group by events.id order by events.starts_at`,
        [from, until],
      );
      return rows.map(toEvent);
    },

    async markSoftReservesReminded(eventId, at) {
      await sql.query("update events set soft_reserves_reminded_at = $2 where id = $1", [eventId, at]);
    },

    async isRecapPosted(eventId) {
      const rows = await sql.query<{ posted: boolean }>(
        "select recap_posted_at is not null as posted from events where id = $1",
        [eventId],
      );
      return rows[0]?.posted ?? false;
    },

    async markRecapPosted(eventId, at) {
      await sql.query("update events set recap_posted_at = $2 where id = $1", [eventId, at]);
    },

    async listStartingAfter(instant, kind) {
      const rows = await sql.query<EventRow>(
        `${SELECT_EVENTS} where events.starts_at > $1 and events.kind = $2 group by events.id order by events.starts_at`,
        [instant, kind],
      );
      return rows.map(toEvent);
    },
  };
}
