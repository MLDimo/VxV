import { PLACES, type Place } from "@vxv/design";

/** The website's address of each place of the tavern that exists already; the others come with their phase. */
const SECTION_HREFS: Partial<Record<Place["id"], string>> = {
  raid: "/raid",
  journal: "/journal",
};

export function sectionHref(place: Place): string | undefined {
  return SECTION_HREFS[place.id];
}

/** The built places' addresses, by place. */
export function sectionHrefs(): Partial<Record<Place["id"], string>> {
  return SECTION_HREFS;
}

/** The sections of the site's menu (§1: Raid, Quêtes, Le Dé Pipé, Ranking, Artisans, Journal), those built. */
export const SECTIONS = ["raid", "quests", "dice", "ranking", "artisans", "journal"].flatMap((id) => {
  const place = PLACES.find((candidate) => candidate.id === id);
  const href = place && sectionHref(place);
  return place && href ? [{ name: place.name, href }] : [];
});
