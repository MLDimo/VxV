import type { CustomTitleRepository } from "../../application/ports.ts";
import type { CustomTitle } from "../../domain/customTitles.ts";
import type { SqlClient } from "../sql.ts";

interface CustomTitleRow {
  id: string;
  name: string;
  reason: string;
  member_id: string;
  member_name: string;
  member_class: string | null;
  discord_id: string;
  until_reset: boolean;
  given_at: Date;
}

// A member is shown by their main character, else by their Discord name.
const SELECT_HELD = `
  select custom_titles.id, custom_titles.name, custom_titles.reason, custom_titles.member_id,
         coalesce(main.first_name || ' ' || main.last_name, members.discord_name) as member_name,
         main.class as member_class, members.discord_id, custom_titles.until_reset, custom_titles.given_at
  from custom_titles
  join members on members.id = custom_titles.member_id
  left join characters main on main.member_id = members.id and main.is_main
  where custom_titles.ended_at is null`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toCustomTitle(row: CustomTitleRow): CustomTitle {
  return {
    id: row.id,
    name: row.name,
    reason: row.reason,
    memberId: row.member_id,
    memberName: row.member_name,
    memberClass: row.member_class ?? undefined,
    discordId: row.discord_id,
    untilReset: row.until_reset,
    givenAt: new Date(row.given_at),
  };
}

export function customTitleRepository(sql: SqlClient): CustomTitleRepository {
  return {
    async create(title, reason, givenAt) {
      await sql.query(
        "insert into custom_titles (name, reason, member_id, until_reset, given_at) values ($1, $2, $3, $4, $5)",
        [title.name, reason, title.memberId, title.untilReset, givenAt],
      );
    },

    async listHeld() {
      const rows = await sql.query<CustomTitleRow>(`${SELECT_HELD} order by custom_titles.given_at desc`);
      return rows.map(toCustomTitle);
    },

    async findHeld(id) {
      if (!UUID.test(id)) {
        return undefined;
      }
      const [row] = await sql.query<CustomTitleRow>(`${SELECT_HELD} and custom_titles.id = $1`, [id]);
      return row && toCustomTitle(row);
    },

    async end(id, at) {
      await sql.query("update custom_titles set ended_at = $2 where id = $1 and ended_at is null", [id, at]);
    },

    async endUntilReset(at) {
      const ending = (await sql.query<CustomTitleRow>(`${SELECT_HELD} and custom_titles.until_reset`)).map(
        toCustomTitle,
      );
      await sql.query("update custom_titles set ended_at = $1 where until_reset and ended_at is null", [at]);
      return ending;
    },
  };
}
