import type { CounterReadingRepository, MissionRepository, MissionRewardRepository } from "../../application/ports.ts";
import type { Mission, MissionType } from "../../domain/missions.ts";
import type { SqlClient } from "../sql.ts";
import { expectRow } from "./rows.ts";
import { isUuid } from "./uuid.ts";

interface MissionRow {
  id: string;
  type: MissionType;
  title: string;
  reward: number;
  starts_at: Date;
  ends_at: Date;
  created_at: Date;
  closed_at: Date | null;
  discord_channel_id: string | null;
  discord_message_id: string | null;
}

const MISSION_COLUMNS = `id, type, title, reward, starts_at, ends_at, created_at, closed_at, discord_channel_id,
  discord_message_id`;

function toMission(row: MissionRow): Mission {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    reward: row.reward,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    closedAt: row.closed_at ?? undefined,
    discordMessage:
      row.discord_channel_id === null || row.discord_message_id === null
        ? undefined
        : { channelId: row.discord_channel_id, messageId: row.discord_message_id },
  };
}

export function missionRepository(sql: SqlClient): MissionRepository {
  return {
    async create(mission, createdBy, createdAt) {
      const rows = await sql.query<{ id: string }>(
        `insert into missions (type, title, reward, starts_at, ends_at, created_by, created_at)
         values ($1, $2, $3, $4, $5, $6, $7) returning id`,
        [mission.type, mission.title, mission.reward, mission.startsAt, mission.endsAt, createdBy, createdAt],
      );
      return expectRow(rows, "create mission").id;
    },

    async findById(missionId) {
      if (!isUuid(missionId)) {
        return undefined;
      }
      const [row] = await sql.query<MissionRow>(`select ${MISSION_COLUMNS} from missions where id = $1`, [missionId]);
      return row && toMission(row);
    },

    async listRecent(limit) {
      const rows = await sql.query<MissionRow>(
        `select ${MISSION_COLUMNS} from missions order by ends_at desc limit $1`,
        [limit],
      );
      return rows.map(toMission);
    },

    async listClosed() {
      const rows = await sql.query<MissionRow>(
        `select ${MISSION_COLUMNS} from missions where closed_at is not null order by ends_at`,
      );
      return rows.map(toMission);
    },

    async close(missionId, closedBy, at) {
      await sql.query("update missions set closed_at = $3, closed_by = $2 where id = $1", [missionId, closedBy, at]);
    },

    async setDiscordMessage(missionId, message) {
      await sql.query("update missions set discord_channel_id = $2, discord_message_id = $3 where id = $1", [
        missionId,
        message.channelId,
        message.messageId,
      ]);
    },
  };
}

/** A member is shown by their main character, else by their Discord name. */
const MEMBER_NAME = `coalesce(main.first_name || ' ' || main.last_name, members.discord_name)`;

export function counterReadingRepository(sql: SqlClient): CounterReadingRepository {
  return {
    async add(readings, sentBy) {
      if (readings.length === 0) {
        return 0;
      }
      const rows = await sql.query<{ added: number }>(
        `with added as (
           insert into counter_readings (character_id, type, value, read_at, sent_by)
           select reading.character_id, reading.type::mission_type, reading.value, reading.read_at, $5
           from unnest($1::uuid[], $2::text[], $3::integer[], $4::timestamptz[])
             as reading(character_id, type, value, read_at)
           on conflict do nothing
           returning 1)
         select count(*)::integer as added from added`,
        [
          readings.map((reading) => reading.characterId),
          readings.map((reading) => reading.type),
          readings.map((reading) => reading.value),
          readings.map((reading) => reading.readAt),
          sentBy,
        ],
      );
      return rows[0]?.added ?? 0;
    },

    async listUntil(type, until) {
      const rows = await sql.query<{
        character_id: string;
        member_id: string;
        member_name: string;
        member_class: string | null;
        value: number;
        read_at: Date;
      }>(
        `select counter_readings.character_id, members.id as member_id, ${MEMBER_NAME} as member_name,
                main.class as member_class, counter_readings.value, counter_readings.read_at
         from counter_readings
         join characters on characters.id = counter_readings.character_id
         join members on members.id = characters.member_id
         left join characters main on main.member_id = members.id and main.is_main
         where counter_readings.type = $1 and counter_readings.read_at <= $2
         order by counter_readings.read_at`,
        [type, until],
      );
      return rows.map((row) => ({
        characterId: row.character_id,
        memberId: row.member_id,
        memberName: row.member_name,
        memberClass: row.member_class ?? undefined,
        type,
        value: row.value,
        readAt: row.read_at,
      }));
    },
  };
}

export function missionRewardRepository(sql: SqlClient): MissionRewardRepository {
  return {
    async save(missionId, rewards) {
      for (const reward of rewards) {
        await sql.query("insert into mission_rewards (mission_id, rank, member_id, amount) values ($1, $2, $3, $4)", [
          missionId,
          reward.rank,
          reward.memberId,
          reward.amount,
        ]);
      }
    },

    async listForMissions(missionIds) {
      const rows = await sql.query<{
        mission_id: string;
        rank: number;
        member_id: string;
        member_name: string;
        member_class: string | null;
        amount: number;
        paid_at: Date | null;
      }>(
        `select mission_rewards.mission_id, mission_rewards.rank, mission_rewards.member_id, ${MEMBER_NAME} as member_name,
                main.class as member_class, mission_rewards.amount, mission_rewards.paid_at
         from mission_rewards
         join members on members.id = mission_rewards.member_id
         left join characters main on main.member_id = members.id and main.is_main
         where mission_rewards.mission_id = any($1::uuid[])
         order by mission_rewards.mission_id, mission_rewards.rank`,
        [missionIds],
      );
      return rows.map((row) => ({
        missionId: row.mission_id,
        rank: row.rank,
        memberId: row.member_id,
        memberName: row.member_name,
        memberClass: row.member_class ?? undefined,
        amount: row.amount,
        paidAt: row.paid_at ?? undefined,
      }));
    },

    async markPaid(missionId, rank, treasurerId, at) {
      await sql.query("update mission_rewards set paid_at = $4, paid_by = $3 where mission_id = $1 and rank = $2", [
        missionId,
        rank,
        treasurerId,
        at,
      ]);
    },
  };
}
