import { parisDay, seasonOn } from "@vxv/design";

/** The tavern's picture at this instant: dressed up for a WoW holiday, else the tavern of every day. */
export function tavernPicture(instant: Date): string {
  const season = seasonOn(parisDay(instant));
  return season === undefined ? "/images/taverne.jpg" : `/images/tavernes/${season.id}.jpg`;
}
