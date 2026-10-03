import type { PGliteInterface } from "@electric-sql/pglite";

/** Minimal rows needed by the schema tests. Each helper returns the primary key it created. */

async function insertReturningId(database: PGliteInterface, sql: string, params: unknown[]): Promise<string> {
  const { rows } = await database.query<{ id: string }>(sql, params);
  const row = rows[0];
  if (!row) {
    throw new Error(`insert returned no row: ${sql}`);
  }
  return row.id;
}

export function insertMember(database: PGliteInterface, discordId: string): Promise<string> {
  return insertReturningId(database, "insert into members (discord_id, discord_name) values ($1, $1) returning id", [
    discordId,
  ]);
}

export function insertCharacter(
  database: PGliteInterface,
  character: { firstName: string; lastName: string; memberId?: string; isMain?: boolean },
): Promise<string> {
  return insertReturningId(
    database,
    `insert into characters (first_name, last_name, class, member_id, is_main)
     values ($1, $2, 'ROGUE', $3, $4) returning id`,
    [character.firstName, character.lastName, character.memberId ?? null, character.isMain ?? false],
  );
}

export async function insertRaidWithBoss(database: PGliteInterface): Promise<{ raidId: string; encounterId: number }> {
  await database.exec(`
    insert into raids (id, name, instance_id) values ('onyxia', 'Onyxia', 249);
    insert into bosses (encounter_id, raid_id, name, position) values (1084, 'onyxia', 'Onyxia', 1);
    insert into items (id, name) values (18423, 'Tête d''Onyxia');
    insert into boss_loot (encounter_id, item_id) values (1084, 18423);
  `);
  return { raidId: "onyxia", encounterId: 1084 };
}

export const ONYXIA_HEAD_ITEM_ID = 18423;

export function insertEvent(database: PGliteInterface, createdBy: string): Promise<string> {
  return insertReturningId(
    database,
    "insert into events (starts_at, created_by) values (now() + interval '1 day', $1) returning id",
    [createdBy],
  );
}

export async function insertSignup(
  database: PGliteInterface,
  signup: { eventId: string; characterId: string; memberId: string },
): Promise<void> {
  await database.query(
    "insert into signups (event_id, character_id, member_id, role, spec) values ($1, $2, $3, 'dps', 'Combat')",
    [signup.eventId, signup.characterId, signup.memberId],
  );
}
