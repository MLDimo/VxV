import type { TitleRepository } from "../../application/ports.ts";
import type { SqlClient } from "../sql.ts";

export function titleRepository(sql: SqlClient): TitleRepository {
  return {
    async saveWeek(week, awards, awardedAt) {
      for (const award of awards) {
        await sql.query(
          "insert into title_awards (week, title, member_id, score, awarded_at) values ($1, $2, $3, $4, $5)",
          [week, award.titleId, award.memberId, award.score, awardedAt],
        );
      }
    },

    async give(week, titleId, memberId, givenAt) {
      await sql.query(
        `insert into title_awards (week, title, member_id, score, awarded_at) values ($1, $2, $3, null, $4)
         on conflict (week, title) do update set member_id = excluded.member_id, score = null,
           awarded_at = excluded.awarded_at`,
        [week, titleId, memberId, givenAt],
      );
    },

    async listHeld(sinceWeek) {
      const rows = await sql.query<{ week: string; title: string; member_id: string }>(
        `select to_char(week, 'YYYY-MM-DD') as week, title, member_id from title_awards
         where $1::date is null or week >= $1::date order by week`,
        [sinceWeek ?? null],
      );
      return rows.map((row) => ({ week: row.week, titleId: row.title, memberId: row.member_id }));
    },

    async listLatestWeeks(weeks) {
      // A member is shown by their main character, else by their Discord name.
      const rows = await sql.query<{
        week: string;
        title: string;
        member_id: string;
        member_name: string;
        member_class: string | null;
        discord_id: string;
        score: number | null;
      }>(
        `select to_char(title_awards.week, 'YYYY-MM-DD') as week, title_awards.title, title_awards.member_id,
                coalesce(main.first_name || ' ' || main.last_name, members.discord_name) as member_name,
                main.class as member_class, members.discord_id, title_awards.score
         from title_awards
         join members on members.id = title_awards.member_id
         left join characters main on main.member_id = members.id and main.is_main
         where title_awards.week in (select distinct week from title_awards order by week desc limit $1)
         order by title_awards.week desc, title_awards.title`,
        [weeks],
      );
      return rows.map((row) => ({
        week: row.week,
        titleId: row.title,
        memberId: row.member_id,
        memberName: row.member_name,
        memberClass: row.member_class ?? undefined,
        discordId: row.discord_id,
        score: row.score ?? undefined,
      }));
    },
  };
}
