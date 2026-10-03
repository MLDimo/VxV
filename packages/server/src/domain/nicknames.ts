import { fullName, type CharacterName } from "./characters.ts";

/** Discord refuses longer nicknames. */
export const MAX_NICKNAME_LENGTH = 32;
const ELLIPSIS = "…";
/** Below this room for the pseudo, the whole nickname is shortened instead. */
const MIN_PSEUDO_ROOM = 2;

/** Shortens the text with an ellipsis, never cutting a character in two (emojis included). */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  let kept = "";
  for (const symbol of text) {
    if (kept.length + symbol.length + ELLIPSIS.length > maxLength) {
      break;
    }
    kept += symbol;
  }
  return kept + ELLIPSIS;
}

/** "Pseudo - [Prénom Nom]", agreed in phase 0. The pseudo is shortened first, so the character stays readable. */
export function guildNickname(pseudo: string, character: CharacterName): string {
  const suffix = ` - [${fullName(character)}]`;
  const room = MAX_NICKNAME_LENGTH - suffix.length;
  return room >= MIN_PSEUDO_ROOM ? truncate(pseudo, room) + suffix : truncate(pseudo + suffix, MAX_NICKNAME_LENGTH);
}
