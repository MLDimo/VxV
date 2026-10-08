import type { SignupRepository } from "../../application/ports.ts";
import { fullName } from "../../domain/characters.ts";
import type { Signup, SignupRole, SignupStatus } from "../../domain/signups.ts";
import type { SqlClient } from "../sql.ts";

interface SignupRow {
  event_id: string;
  member_id: string;
  character_id: string;
  role: SignupRole;
  spec: string;
  status: SignupStatus;
  signed_up_at: Date;
  first_name: string;
  last_name: string;
  class: string;
}

const SELECT_SIGNUPS = `
  select signups.event_id, signups.member_id, signups.character_id, signups.role, signups.spec, signups.status,
         signups.signed_up_at, characters.first_name, characters.last_name, characters.class
  from signups join characters on characters.id = signups.character_id`;

function toSignup(row: SignupRow): Signup {
  return {
    eventId: row.event_id,
    memberId: row.member_id,
    characterId: row.character_id,
    characterName: fullName({ firstName: row.first_name, lastName: row.last_name }),
    characterClass: row.class,
    role: row.role,
    spec: row.spec,
    status: row.status,
    signedUpAt: new Date(row.signed_up_at),
  };
}

export function signupRepository(sql: SqlClient): SignupRepository {
  return {
    async listReminderTargets(eventId) {
      const rows = await sql.query<{ discord_id: string; status: SignupStatus; has_soft_reserves: boolean }>(
        `select members.discord_id, signups.status,
                exists (select 1 from soft_reserves
                        where soft_reserves.event_id = signups.event_id
                          and soft_reserves.character_id = signups.character_id) as has_soft_reserves
         from signups
         join members on members.id = signups.member_id
         where signups.event_id = $1
         order by members.discord_name`,
        [eventId],
      );
      return rows.map((row) => ({
        discordId: row.discord_id,
        status: row.status,
        hasSoftReserves: row.has_soft_reserves,
      }));
    },

    async listByEvent(eventId) {
      const rows = await sql.query<SignupRow>(
        `${SELECT_SIGNUPS} where signups.event_id = $1
         order by signups.role, characters.first_name, characters.last_name`,
        [eventId],
      );
      return rows.map(toSignup);
    },

    async findByMember(eventId, memberId) {
      const [row] = await sql.query<SignupRow>(
        `${SELECT_SIGNUPS} where signups.event_id = $1 and signups.member_id = $2`,
        [eventId, memberId],
      );
      return row && toSignup(row);
    },

    async changedAt(eventId, memberId) {
      const [row] = await sql.query<{ updated_at: Date; reserves_updated_at: Date | null }>(
        "select updated_at, reserves_updated_at from signups where event_id = $1 and member_id = $2",
        [eventId, memberId],
      );
      return (
        row && {
          signup: new Date(row.updated_at),
          reserves: row.reserves_updated_at === null ? undefined : new Date(row.reserves_updated_at),
        }
      );
    },

    async save(signup, changedAt) {
      await sql.query(
        `insert into signups (event_id, character_id, member_id, role, spec, status, updated_at, signed_up_at)
         values ($1, $2, $3, $4, $5, $6, $7, $7)
         on conflict (event_id, character_id) do update
           set role = excluded.role, spec = excluded.spec, status = excluded.status, updated_at = excluded.updated_at`,
        [signup.eventId, signup.characterId, signup.memberId, signup.role, signup.spec, signup.status, changedAt],
      );
    },

    async delete(eventId, characterId) {
      await sql.query("delete from signups where event_id = $1 and character_id = $2", [eventId, characterId]);
    },
  };
}
