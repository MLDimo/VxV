import type { CashRepository } from "../../application/ports.ts";
import type { CashMovementKind } from "../../domain/cash.ts";
import type { SqlClient } from "../sql.ts";

interface CashRow {
  id: string;
  occurred_at: Date;
  kind: CashMovementKind;
  amount: number;
  label: string;
  reason: string;
  recorded_by_name: string;
  member_id: string | null;
  member_name: string | null;
}

export function cashRepository(sql: SqlClient): CashRepository {
  return {
    async record(movement, occurredAt) {
      await sql.query(
        `insert into cash_movements (occurred_at, kind, amount, label, reason, recorded_by, bet_id, member_id,
                                     mission_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          occurredAt,
          movement.kind,
          movement.amount,
          movement.label,
          movement.reason,
          movement.recordedBy,
          movement.betId ?? null,
          movement.memberId ?? null,
          movement.missionId ?? null,
        ],
      );
    },

    async listAll() {
      // The giver is shown by their main character, else by their Discord name.
      const rows = await sql.query<CashRow>(
        `select cash_movements.id::text as id, occurred_at, kind, amount, label, reason,
                recorder.discord_name as recorded_by_name, cash_movements.member_id,
                coalesce(main.first_name || ' ' || main.last_name, giver.discord_name) as member_name
         from cash_movements
         join members recorder on recorder.id = cash_movements.recorded_by
         left join members giver on giver.id = cash_movements.member_id
         left join characters main on main.member_id = cash_movements.member_id and main.is_main
         order by cash_movements.id desc`,
      );
      return rows.map((row) => ({
        id: row.id,
        occurredAt: row.occurred_at,
        kind: row.kind,
        amount: row.amount,
        label: row.label,
        reason: row.reason,
        recordedByName: row.recorded_by_name,
        memberId: row.member_id ?? undefined,
        memberName: row.member_name ?? undefined,
      }));
    },
  };
}
