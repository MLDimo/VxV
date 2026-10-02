import type { MemberRepository } from "../../application/ports.ts";
import type { Member, MemberRole } from "../../domain/members.ts";
import type { SqlClient } from "../sql.ts";
import { expectRow } from "./rows.ts";

interface MemberRow {
  id: string;
  discord_id: string;
  discord_name: string;
  role: MemberRole;
}

const COLUMNS = "id, discord_id, discord_name, role";

function toMember(row: MemberRow): Member {
  return { id: row.id, discordId: row.discord_id, discordName: row.discord_name, role: row.role };
}

export function memberRepository(sql: SqlClient): MemberRepository {
  return {
    async saveFromDiscord(identity, role) {
      const statement = `insert into members (discord_id, discord_name, role) values ($1, $2, $3)
        on conflict (discord_id) do update set discord_name = excluded.discord_name, role = excluded.role
        returning ${COLUMNS}`;
      const rows = await sql.query<MemberRow>(statement, [identity.discordId, identity.discordName, role]);
      return toMember(expectRow(rows, "save member"));
    },

    async findById(id) {
      const [row] = await sql.query<MemberRow>(`select ${COLUMNS} from members where id = $1`, [id]);
      return row && toMember(row);
    },
  };
}
