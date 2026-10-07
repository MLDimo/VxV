import "server-only";
import { fullName } from "@vxv/server";
import { getApplication } from "./application";

/** The guild's members by their main character, for the officers' lists (a donor, a title's holder). */
export async function guildMembers(): Promise<{ memberId: string; name: string }[]> {
  return (await getApplication().characters.listInGuild()).flatMap((character) =>
    character.isMain && character.memberId !== undefined
      ? [{ memberId: character.memberId, name: fullName(character) }]
      : [],
  );
}
