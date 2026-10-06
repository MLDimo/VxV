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

/** Pages under another address that belong to a place: an event and the loot history are the raid's. */
const OTHER_PAGES: readonly (readonly [string, Place["id"]])[] = [
  ["/evenements", "raid"],
  ["/historique", "raid"],
];

/** The place a page of the website belongs to, if any. */
export function placeOfPath(path: string): Place | undefined {
  const within = (href: string) => path === href || path.startsWith(`${href}/`);
  const id =
    PLACES.find((place) => within(SECTION_HREFS[place.id]))?.id ?? OTHER_PAGES.find(([href]) => within(href))?.[1];
  return PLACES.find((place) => place.id === id);
}

/** The sections of the site's menu (§1: Raid, Quêtes, Le Dé Pipé, Ranking, Artisans, Journal). */
export const SECTIONS = ["raid", "quests", "dice", "ranking", "artisans", "journal"].flatMap((id) => {
  const place = PLACES.find((candidate) => candidate.id === id);
  return place ? [{ name: place.name, href: sectionHref(place) }] : [];
});
