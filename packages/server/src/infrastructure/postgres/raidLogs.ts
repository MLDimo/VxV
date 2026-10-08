import type { RaidLogRepository } from "../../application/ports.ts";
import type { GuildEvent } from "../../domain/events.ts";
import type { SqlClient } from "../sql.ts";
import { eventRepository } from "./events.ts";

export function raidLogRepository(sql: SqlClient): RaidLogRepository {
  return {
    async find(eventId) {
      const [row] = await sql.query<{ content: string }>("select content from raid_logs where event_id = $1", [
        eventId,
      ]);
      return row?.content;
    },

    async save(eventId, content, receivedAt) {
      await sql.query(
        `insert into raid_logs (event_id, content, received_at) values ($1, $2, $3)
         on conflict (event_id) do update set content = excluded.content, received_at = excluded.received_at`,
        [eventId, content, receivedAt],
      );
    },

    async listUnannounced(startedBefore) {
      const rows = await sql.query<{ event_id: string; content: string }>(
        `select raid_logs.event_id, raid_logs.content from raid_logs join events on events.id = raid_logs.event_id
         where events.recap_posted_at is null and events.starts_at < $1 order by events.starts_at`,
        [startedBefore],
      );
      const events = eventRepository(sql);
      const found: { event: GuildEvent; content: string }[] = [];
      for (const row of rows) {
        const event = await events.findById(row.event_id);
        if (event !== undefined) {
          found.push({ event, content: row.content });
        }
      }
      return found;
    },

    async listStartedSince(since) {
      const rows = await sql.query<{ starts_at: Date; content: string }>(
        `select events.starts_at, raid_logs.content from raid_logs join events on events.id = raid_logs.event_id
         where $1::timestamptz is null or events.starts_at >= $1 order by events.starts_at`,
        [since ?? null],
      );
      return rows.map((row) => ({ startsAt: row.starts_at, content: row.content }));
    },
  };
}
