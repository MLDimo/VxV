import { fullName, type Character } from "./characters.ts";

/** The line format of the data the website hands to the addon (VXV-RAID, VXV-PARIS…): fields separated by ";". */

const MS_PER_SECOND = 1000;

/** An instant as Unix seconds, as the game's clock reads it. */
export function seconds(date: Date): number {
  return Math.floor(date.getTime() / MS_PER_SECOND);
}

/** Free text in one field: the separators of the format become commas. */
export function text(value: string): string {
  return value
    .split(/[;\r\n]+/)
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join(", ");
}

export function line(...fields: readonly (string | number)[]): string {
  return fields.join(";");
}

export function flag(value: boolean): number {
  return value ? 1 : 0;
}

/** Who reads a bundle's data in game, and when the website exported them. */
export interface AddonReaders {
  /** Characters of the officers and the guild master: the addon takes the data from them only. */
  officers: readonly Character[];
  /** The guild's characters linked to a member: the addon finds the player's member by the character played. */
  characters: readonly Character[];
  exportedAt: Date;
}

/**
 * The lines every bundle's data start with (contract with addon/VXV_Core/Core/SiteData.lua): the header, then
 * P;export (Unix seconds), O;officer character, M;member id;character of the member.
 */
export function addonHead(header: string, { officers, characters, exportedAt }: AddonReaders): string[] {
  return [
    header,
    line("P", seconds(exportedAt)),
    ...officers.map((officer) => line("O", fullName(officer))),
    ...characters.flatMap((character) =>
      character.memberId === undefined ? [] : [line("M", character.memberId, fullName(character))],
    ),
  ];
}
