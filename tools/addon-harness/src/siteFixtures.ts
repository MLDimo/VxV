import type { Character } from "@vxv/server/domain/characters";

/** When the website exported the fixtures' data: 10 December in the morning, the mocked client's day. */
export const EXPORTED = new Date("2026-12-10T07:30:00Z");

/** A character of the guild linked to a member. */
export function character(firstName: string, lastName: string, memberId: string): Character {
  return { id: `c-${firstName}`, firstName, lastName, characterClass: "ROGUE", memberId, isMain: true, inGuild: true };
}

/** Who reads the site's data in the fixtures: Ðéjà Vu, an officer, then Thom Leboss and Ciel Gris. */
export const GUILD_READERS = {
  officers: [character("Ðéjà", "Vu", "m-deja")],
  characters: [
    character("Ðéjà", "Vu", "m-deja"),
    character("Thom", "Leboss", "m-thom"),
    character("Ciel", "Gris", "m-ciel"),
  ],
};
