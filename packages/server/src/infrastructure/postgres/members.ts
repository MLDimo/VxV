import type { MemberRepository } from "../../application/ports.ts";
import type { Member, MemberRole } from "../../domain/members.ts";
import type { SqlClient } from "../sql.ts";
import { expectRow } from "./rows.ts";

interface MemberRow {
  id: string;
  discord_id: string;
  discord_name: string;
  roles: MemberRole[];
}

// Drivers may not know the enum array type: roles travel as text[], which every driver reads and writes.
const COLUMNS = "id, discord_id, discord_name, roles::text[] as roles";

function toMember(row: MemberRow): Member {
  return { id: row.id, discordId: row.discord_id, discordName: row.discord_name, roles: row.roles };
}

export function memberRepository(sql: SqlClient): MemberRepository {
  return {
    async saveFromDiscord(identity, roles) {
      const statement = `insert into members (discord_id, discord_name, roles) values ($1, $2, $3::text[]::member_role[])
        on conflict (discord_id) do update set discord_name = excluded.discord_name, roles = excluded.roles
        returning ${COLUMNS}`;
      const rows = await sql.query<MemberRow>(statement, [identity.discordId, identity.discordName, roles]);
      return toMember(expectRow(rows, "save member"));
    },

    async findById(id) {
      const [row] = await sql.query<MemberRow>(`select ${COLUMNS} from members where id = $1`, [id]);
      return row && toMember(row);
    },

    async listAll() {
      return (await sql.query<MemberRow>(`select ${COLUMNS} from members order by discord_name`)).map(toMember);
    },

    async setRoles(memberId, roles) {
      await sql.query("update members set roles = $2::text[]::member_role[] where id = $1", [memberId, roles]);
    },
  };
}
