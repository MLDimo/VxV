import { PLACES, type Place } from "@vxv/design";

/** The website's address of each place of the tavern. */
const SECTION_HREFS: Record<Place["id"], string> = {
  raid: "/raid",
  dice: "/paris",
  quests: "/quetes",
  ranking: "/ranking",
  artisans: "/artisans",
  journal: "/journal",
};

export function sectionHref(place: Place): string {
  return SECTION_HREFS[place.id];
}

/** The sections of the site's menu (§1: Raid, Quêtes, Le Dé Pipé, Ranking, Artisans, Journal). */
export const SECTIONS = ["raid", "quests", "dice", "ranking", "artisans", "journal"].flatMap((id) => {
  const place = PLACES.find((candidate) => candidate.id === id);
  return place ? [{ name: place.name, href: sectionHref(place) }] : [];
});
