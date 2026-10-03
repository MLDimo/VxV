import type { Character } from "../domain/characters.ts";
import type { Member, MemberRole } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
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
