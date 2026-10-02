/** A WoW Forever character: first and last name, unique across the game. */
export interface Character {
  id: string;
  firstName: string;
  lastName: string;
  /** Class token as the game reports it, e.g. "ROGUE". */
  characterClass: string;
  memberId: string | undefined;
  isMain: boolean;
  inGuild: boolean;
}

export interface CharacterName {
  firstName: string;
  lastName: string;
}

export function fullName({ firstName, lastName }: CharacterName): string {
  return `${firstName} ${lastName}`;
}
