import { TITLES } from "./titles.ts";

/**
 * Titles made by hand (owner's request of 9 October): an officer names one and gives it to a member, with the reason
 * shown with it, until the next Wednesday's reset or for an undetermined time. Shown everywhere a title shows (game,
 * Discord role, website), never counted in the Ranking.
 */

export const MAX_CUSTOM_TITLE_LENGTH = 40;

export interface NewCustomTitle {
  name: string;
  memberId: string;
  /** Ends at the next Wednesday's reset; else held until an officer takes it back. */
  untilReset: boolean;
}

export interface CustomTitle {
  id: string;
  name: string;
  reason: string;
  memberId: string;
  /** The member's main character, else their Discord name. */
  memberName: string;
  memberClass: string | undefined;
  discordId: string;
  untilReset: boolean;
  givenAt: Date;
}

/** Why a title cannot be made with this name, or undefined. */
export function customTitleRefusal(name: string): string | undefined {
  const trimmed = name.trim();
  if (trimmed === "") {
    return "Donnez un nom au titre.";
  }
  if (trimmed.length > MAX_CUSTOM_TITLE_LENGTH) {
    return `Un titre tient en ${String(MAX_CUSTOM_TITLE_LENGTH)} caractères au plus.`;
  }
  if (TITLES.some((title) => title.name.toLowerCase() === trimmed.toLowerCase())) {
    return "Ce nom est celui d'un titre de la guilde : choisissez-en un autre.";
  }
  return undefined;
}

/** How long the title is held: "jusqu'au reset du mercredi", "pour une durée indéterminée". */
export function customTitleDuration(untilReset: boolean): string {
  return untilReset ? "jusqu'au reset du mercredi" : "pour une durée indéterminée";
}
