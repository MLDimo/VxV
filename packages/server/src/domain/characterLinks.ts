import type { Character } from "./characters.ts";

/** Why the member may not link this character to themselves, or undefined when they may. */
export function linkRefusal(character: Character | undefined, memberId: string): string | undefined {
  if (character === undefined) {
    return "Ce personnage est introuvable.";
  }
  if (!character.inGuild) {
    return "Ce personnage ne fait pas partie de la guilde.";
  }
  if (character.memberId !== undefined && character.memberId !== memberId) {
    return "Ce personnage est déjà lié à un autre membre. En cas d'erreur, contactez un officier.";
  }
  return undefined;
}

/** A member only changes their own characters. */
export function ownershipRefusal(character: Character | undefined, memberId: string): string | undefined {
  return character?.memberId === memberId ? undefined : "Ce personnage ne vous appartient pas.";
}
