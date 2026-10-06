import { addonHead, line, text, type AddonReaders } from "./addonText.ts";
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
    score: number;
  }[];
}

/**
 * The titles of the week as the companion hands them to the addon, one record per line, after the head of every
 * bundle's data (addonHead: P, O and M):
 * T;title id;name;rule;member id, empty for nobody;member;class token, empty without main;score (each title, in order)
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
  ].join("\n");
}
