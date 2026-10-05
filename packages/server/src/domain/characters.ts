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

/** A character as the game draws it, for the avatars: race token (Orc, Scourge…) and sex. */
export interface Appearance {
  race: string;
  sex: "male" | "female";
}

/** UnitSex in game: 2 for male, 3 for female (1 when unknown). */
const GAME_SEXES: Readonly<Record<number, Appearance["sex"]>> = { 2: "male", 3: "female" };
const RACE_TOKEN = /^[A-Za-z]{1,30}$/;

/** The appearance the addon read in game (UnitRace's token, UnitSex), or undefined when it is not one. */
export function appearanceFromGame(race: string, sex: number): Appearance | undefined {
  const known = GAME_SEXES[sex];
  return known !== undefined && RACE_TOKEN.test(race) ? { race, sex: known } : undefined;
}
