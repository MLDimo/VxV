import type { JournalRepository } from "../../application/ports.ts";
import type { JournalAction, JournalEntry } from "../../domain/journal.ts";
import type { SqlClient } from "../sql.ts";

interface JournalRow {
  id: string;
  occurred_at: Date;
  actor_name: string;
  action: JournalAction;
  entity: string;
  entity_id: string;
  before: unknown;
  after: unknown;
  reason: string;
}

function toEntry(row: JournalRow): JournalEntry {
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    actorName: row.actor_name,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    before: row.before,
    after: row.after,
    reason: row.reason,
  };
}

export function journalRepository(sql: SqlClient): JournalRepository {
  return {
    async record(entry) {
      await sql.query(
        `insert into journal (actor_id, action, entity, entity_id, before, after, reason)
         values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)`,
        [
          entry.actorId,
          entry.action,
          entry.entity,
          entry.entityId,
          JSON.stringify(entry.before),
          JSON.stringify(entry.after),
          entry.reason,
        ],
      );
    },

    async listRecent(limit) {
      const rows = await sql.query<JournalRow>(
        `select journal.id::text as id, occurred_at, members.discord_name as actor_name, action, entity,
                entity_id, before, after, reason
         from journal join members on members.id = journal.actor_id
         order by journal.id desc
         limit $1`,
        [limit],
      );
      return rows.map(toEntry);
    },
  };
}
