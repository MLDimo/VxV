import type { Character } from "../domain/characters.ts";
import { canManageRaids } from "../domain/permissions.ts";
import type { Repositories } from "./ports.ts";

/**
 * Who reads the website's data in game: the guild's characters, by which the addon finds the player's member, and
 * those of the officers and the guild master, from whom only the addon takes the data.
 */
export async function addonReaders(
  repositories: Repositories,
): Promise<{ officers: Character[]; characters: Character[] }> {
  const members = await repositories.members.listAll();
  const managers = new Set(members.filter((member) => canManageRaids(member.roles)).map((member) => member.id));
  const characters = (await repositories.characters.listAll()).filter((character) => character.inGuild);
  return {
    officers: characters.filter((character) => character.memberId !== undefined && managers.has(character.memberId)),
    characters,
  };
}
