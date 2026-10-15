import type { LegendRepository, StoredExploit } from "../../application/ports.ts";
import type { ExploitCategory, ExploitRarity, ExploitStatus } from "../../domain/legend.ts";
import type { SqlClient } from "../sql.ts";

interface ExploitRow {
  id: string;
  title: string;
  occurred_on: string;
  occurred_time: string | null;
  place: string;
  category: ExploitCategory;
  story: string;
  quote: string;
  quote_by: string;
  stats: string[];
  event_id: string | null;
  proposed_by: string;
  proposed_at: Date;
  status: ExploitStatus;
  chapter_id: string | null;
  rarity: ExploitRarity | null;
  mvp_id: string | null;
  mvp_why: string;
  loot: string;
  refusal: string | null;
}

const EXPLOIT_COLUMNS = `id, title, to_char(occurred_on, 'YYYY-MM-DD') as occurred_on,
  to_char(occurred_time, 'HH24:MI') as occurred_time, place, category, story, quote, quote_by, stats, event_id,
  proposed_by, proposed_at, status, chapter_id, rarity, mvp_id, mvp_why, loot, refusal`;

function exploit(row: ExploitRow): StoredExploit {
  return {
    id: row.id,
    title: row.title,
    occurredOn: row.occurred_on,
    occurredTime: row.occurred_time ?? "",
    place: row.place,
    category: row.category,
    story: row.story,
    quote: row.quote,
    quoteBy: row.quote_by,
    stats: row.stats,
    eventId: row.event_id ?? undefined,
    proposedBy: row.proposed_by,
    proposedAt: row.proposed_at,
    status: row.status,
    chapterId: row.chapter_id ?? undefined,
    rarity: row.rarity ?? undefined,
    mvpId: row.mvp_id ?? undefined,
    mvpWhy: row.mvp_why,
    loot: row.loot,
    refusal: row.refusal ?? undefined,
  };
}

export function legendRepository(sql: SqlClient): LegendRepository {
  return {
    async createChapter(chapter, createdBy, at) {
      const [row] = await sql.query<{ id: string }>(
        "insert into legend_chapters (title, period, created_by, created_at) values ($1, $2, $3, $4) returning id",
        [chapter.title, chapter.period, createdBy, at],
      );
      return row?.id ?? "";
    },

    async listChapters() {
      const rows = await sql.query<{ id: string; title: string; period: string; created_at: Date }>(
        "select id, title, period, created_at from legend_chapters order by created_at, id",
      );
      return rows.map((row) => ({ id: row.id, title: row.title, period: row.period, createdAt: row.created_at }));
    },

    async propose(proposal, images, proposedBy, at) {
      const [row] = await sql.query<{ id: string }>(
        `insert into legend_exploits (title, occurred_on, occurred_time, place, category, story, quote, quote_by, stats,
                                      event_id, proposed_by, proposed_at)
         values ($1, $2::date, nullif($3, '')::time, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id`,
        [
          proposal.title,
          proposal.occurredOn,
          proposal.occurredTime,
          proposal.place,
          proposal.category,
          proposal.story,
          proposal.quote,
          proposal.quoteBy,
          proposal.stats,
          proposal.eventId ?? null,
          proposedBy,
          at,
        ],
      );
      const id = row?.id ?? "";
      for (const [index, image] of images.entries()) {
        await sql.query(
          "insert into legend_images (exploit_id, position, content_type, bytes) values ($1, $2, $3, $4)",
          [id, index + 1, image.contentType, image.bytes],
        );
      }
      return id;
    },

    async find(id) {
      const [row] = await sql.query<ExploitRow>(`select ${EXPLOIT_COLUMNS} from legend_exploits where id = $1`, [id]);
      return row && exploit(row);
    },

    async list() {
      const rows = await sql.query<ExploitRow>(
        `select ${EXPLOIT_COLUMNS} from legend_exploits order by occurred_on, occurred_time nulls first, proposed_at`,
      );
      return rows.map(exploit);
    },

    async publish(id, placement, reviewedBy, at) {
      const rows = await sql.query(
        `update legend_exploits set status = 'published', chapter_id = $2, rarity = $3, mvp_id = $4, mvp_why = $5,
                loot = $6, reviewed_by = $7, reviewed_at = $8
         where id = $1 and status = 'proposed' returning id`,
        [
          id,
          placement.chapterId,
          placement.rarity,
          placement.mvpId ?? null,
          placement.mvpWhy,
          placement.loot,
          reviewedBy,
          at,
        ],
      );
      return rows.length > 0;
    },

    async refuse(id, reason, reviewedBy, at) {
      const rows = await sql.query(
        `update legend_exploits set status = 'refused', refusal = $2, reviewed_by = $3, reviewed_at = $4
         where id = $1 and status = 'proposed' returning id`,
        [id, reason, reviewedBy, at],
      );
      return rows.length > 0;
    },

    async listImages(exploitIds) {
      const rows = await sql.query<{ id: string; exploit_id: string; position: number }>(
        `select id, exploit_id, position from legend_images where exploit_id = any($1::uuid[])
         order by exploit_id, position`,
        [exploitIds],
      );
      return rows.map((row) => ({ id: row.id, exploitId: row.exploit_id, position: row.position }));
    },

    async findImage(id) {
      const [row] = await sql.query<{ exploit_id: string; content_type: string; bytes: Uint8Array }>(
        "select exploit_id, content_type, bytes from legend_images where id = $1",
        [id],
      );
      return row && { exploitId: row.exploit_id, contentType: row.content_type, bytes: row.bytes };
    },

    async setPresence(exploitId, memberId, present, at) {
      await sql.query(
        present
          ? `insert into legend_presences (exploit_id, member_id, declared_at) values ($1, $2, $3)
             on conflict do nothing`
          : "delete from legend_presences where exploit_id = $1 and member_id = $2",
        present ? [exploitId, memberId, at] : [exploitId, memberId],
      );
    },

    async listPresences() {
      const rows = await sql.query<{ exploit_id: string; member_id: string }>(
        "select exploit_id, member_id from legend_presences",
      );
      return rows.map((row) => ({ exploitId: row.exploit_id, memberId: row.member_id }));
    },

    async listRaidPresences(eventIds) {
      const rows = await sql.query<{ event_id: string; member_id: string }>(
        `select distinct event_attendance.event_id, characters.member_id
         from event_attendance join characters on characters.id = event_attendance.character_id
         where event_attendance.event_id = any($1::uuid[]) and characters.member_id is not null`,
        [eventIds],
      );
      return rows.map((row) => ({ eventId: row.event_id, memberId: row.member_id }));
    },

    async addComment(exploitId, memberId, body, at) {
      await sql.query("insert into legend_comments (exploit_id, member_id, body, written_at) values ($1, $2, $3, $4)", [
        exploitId,
        memberId,
        body,
        at,
      ]);
    },

    async listComments(exploitId) {
      const rows = await sql.query<{ member_id: string; body: string; written_at: Date }>(
        "select member_id, body, written_at from legend_comments where exploit_id = $1 order by written_at, id",
        [exploitId],
      );
      return rows.map((row) => ({ memberId: row.member_id, body: row.body, writtenAt: row.written_at }));
    },
  };
}
