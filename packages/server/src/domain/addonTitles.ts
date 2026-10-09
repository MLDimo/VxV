import { addonHead, line, text, type AddonReaders } from "./addonText.ts";
import type { CustomTitle } from "./customTitles.ts";
import { TITLES } from "./titles.ts";

/** First line of the titles' data for the addon (contract with VXV_Titles); the number is the format version. */
export const ADDON_TITLES_HEADER = "VXV-TITRES-1";

export interface AddonTitlesFacts extends AddonReaders {
  /** The holders of the latest week given. */
  holders: readonly {
    titleId: string;
    memberId: string;
    memberName: string;
    memberClass: string | undefined;
    /** None for a title an officer gave: 0 in the line. */
    score: number | undefined;
  }[];
  /** The titles made by hand held now. */
  custom: readonly Pick<CustomTitle, "id" | "name" | "reason" | "memberId" | "memberName" | "memberClass">[];
}

/**
 * The titles of the week as the companion hands them to the addon, one record per line, after the head of every
 * bundle's data (addonHead: P, O and M):
 * T;title id;name;rule;member id, empty for nobody;member;class token, empty without main;score (each title, in order,
 * then the titles made by hand, their reason as their rule and 0 as their score)
 * The names and rules come with the data: a new title shows in game without any update of the addon (P13.6).
 */
export function formatAddonTitles(facts: AddonTitlesFacts): string {
  return [
    ...addonHead(ADDON_TITLES_HEADER, facts),
    ...TITLES.map((title) => {
      const holder = facts.holders.find((candidate) => candidate.titleId === title.id);
      return line(
        "T",
        title.id,
        text(title.name),
        text(title.rule),
        holder?.memberId ?? "",
        text(holder?.memberName ?? ""),
        holder?.memberClass ?? "",
        holder?.score ?? 0,
      );
    }),
    ...facts.custom.map((title) =>
      line(
        "T",
        `custom-${title.id}`,
        text(title.name),
        text(title.reason),
        title.memberId,
        text(title.memberName),
        title.memberClass ?? "",
        0,
      ),
    ),
  ].join("\n");
}
