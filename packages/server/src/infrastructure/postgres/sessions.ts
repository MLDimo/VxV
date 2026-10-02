import type { SessionRepository } from "../../application/ports.ts";
import type { SqlClient } from "../sql.ts";

export function sessionRepository(sql: SqlClient): SessionRepository {
  return {
    async create(session) {
      await sql.query("insert into sessions (id, member_id, expires_at) values ($1, $2, $3)", [
        session.id,
        session.memberId,
        session.expiresAt,
      ]);
    },

    async findMemberId(sessionId, now) {
      const [row] = await sql.query<{ member_id: string }>(
        "select member_id from sessions where id = $1 and expires_at > $2",
        [sessionId, now],
      );
      return row?.member_id;
    },

    async delete(sessionId) {
      await sql.query("delete from sessions where id = $1", [sessionId]);
    },
  };
}
