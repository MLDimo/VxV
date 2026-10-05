import type { CompanionCode, CompanionRepository, CompanionToken } from "../../application/ports.ts";
import type { SqlClient } from "../sql.ts";

interface CodeRow {
  id: string;
  member_id: string;
  challenge: string;
  expires_at: Date;
}

interface TokenRow {
  id: string;
  member_id: string;
  expires_at: Date;
  roles_checked_at: Date;
}

function toCode(row: CodeRow): CompanionCode {
  return { id: row.id, memberId: row.member_id, challenge: row.challenge, expiresAt: new Date(row.expires_at) };
}

function toToken(row: TokenRow): CompanionToken {
  return {
    id: row.id,
    memberId: row.member_id,
    expiresAt: new Date(row.expires_at),
    rolesCheckedAt: new Date(row.roles_checked_at),
  };
}

export function companionRepository(sql: SqlClient): CompanionRepository {
  return {
    async createCode(code) {
      await sql.query("insert into companion_codes (id, member_id, challenge, expires_at) values ($1, $2, $3, $4)", [
        code.id,
        code.memberId,
        code.challenge,
        code.expiresAt,
      ]);
    },

    async takeCode(codeId, now) {
      await sql.query("delete from companion_codes where expires_at <= $1", [now]);
      const [row] = await sql.query<CodeRow>(
        "delete from companion_codes where id = $1 returning id, member_id, challenge, expires_at",
        [codeId],
      );
      return row && toCode(row);
    },

    async createToken(token) {
      await sql.query(
        "insert into companion_tokens (id, member_id, expires_at, roles_checked_at) values ($1, $2, $3, $4)",
        [token.id, token.memberId, token.expiresAt, token.rolesCheckedAt],
      );
    },

    async findToken(tokenId, now) {
      const [row] = await sql.query<TokenRow>(
        `select id, member_id, expires_at, roles_checked_at from companion_tokens
         where id = $1 and expires_at > $2`,
        [tokenId, now],
      );
      return row && toToken(row);
    },

    async renewToken(tokenId, expiresAt, rolesCheckedAt) {
      await sql.query("update companion_tokens set expires_at = $2, roles_checked_at = $3 where id = $1", [
        tokenId,
        expiresAt,
        rolesCheckedAt,
      ]);
    },

    async deleteToken(tokenId) {
      await sql.query("delete from companion_tokens where id = $1", [tokenId]);
    },
  };
}
