import type { Character } from "../domain/characters.ts";
import type { Member, MemberRole } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { eventRepository } from "../infrastructure/postgres/events.ts";
import { memberRepository } from "../infrastructure/postgres/members.ts";
import type { SqlClient } from "../infrastructure/sql.ts";

/** Saves a member as a Discord sign-in would. */
export function createMember(sql: SqlClient, role: MemberRole, name = `${role}-member`): Promise<Member> {
  return memberRepository(sql).saveFromDiscord({ discordId: `discord-${name}`, discordName: name }, role);
}

/** Adds guild characters named "Prénom Nom" and returns them, one per name, in the given order. */
export async function createGuildCharacters<const Names extends readonly string[]>(
  sql: SqlClient,
  ...names: Names
): Promise<{ [Index in keyof Names]: Character }> {
  const repository = characterRepository(sql);
  await repository.add(
    names.map((name) => {
      const [firstName = "", lastName = ""] = name.split(" ");
      return { firstName, lastName, characterClass: "ROGUE" };
    }),
  );
  const all = await repository.listAll();
  return names.map((name) => {
    const character = all.find((candidate) => `${candidate.firstName} ${candidate.lastName}` === name);
    if (character === undefined) {
      throw new Error(`character ${name} was not created`);
    }
    return character;
  }) as { [Index in keyof Names]: Character };
}

/** Raids as the generated raid data would create them; ids are slugs, names are given. */
export async function createRaids(sql: SqlClient, raids: Record<string, string>): Promise<void> {
  let instanceId = 1;
  for (const [id, name] of Object.entries(raids)) {
    await sql.query("insert into raids (id, name, instance_id) values ($1, $2, $3)", [id, name, instanceId]);
    instanceId += 1;
  }
}

/** An event on the given raids, as an officer would create it. */
export function createEvent(sql: SqlClient, createdBy: Member, startsAt: Date, raidIds: string[]): Promise<string> {
  return eventRepository(sql).create({ startsAt, raidIds, softReservesPerPlayer: 1 }, createdBy.id);
}

/** Onyxia's lair with two bosses and their loot, as the generated raid data would create it. */
export async function createRaidWithLoot(sql: SqlClient): Promise<void> {
  await sql.query("insert into raids (id, name, instance_id) values ('onyxia', 'Onyxia', 249)");
  await sql.query(
    `insert into bosses (encounter_id, raid_id, name, position) values
       (1, 'onyxia', 'Gardienne', 1), (2, 'onyxia', 'Onyxia', 2)`,
  );
  await sql.query(
    `insert into items (id, name) values (10, 'Cape de la gardienne'), (20, 'Tête d''Onyxia'), (21, 'Sac en peau')`,
  );
  await sql.query("insert into boss_loot (encounter_id, item_id) values (1, 10), (2, 20), (2, 21)");
}

/** A loot already received by a character during an event. */
export async function recordLoot(
  sql: SqlClient,
  loot: { eventId: string; encounterId: number; itemId: number; characterId: string },
): Promise<void> {
  await sql.query(
    "insert into loots (event_id, encounter_id, item_id, character_id, looted_at) values ($1, $2, $3, $4, now())",
    [loot.eventId, loot.encounterId, loot.itemId, loot.characterId],
  );
}
