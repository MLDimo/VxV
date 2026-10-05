/**
 * The places of the tavern (docs/design/VXV_Design_Spec.md §1 and §4): one place is one tab, with the same name
 * on the website, in the addon and on Discord. Positions are percentages of the scene, so they hold at any size.
 */

/** Where a place's plaque sits relative to its clickable zone. */
export type PlaqueAnchor = "above" | "board" | "middle" | "table" | "door";

export interface Place {
  id: "raid" | "dice" | "quests" | "ranking" | "artisans" | "journal";
  name: string;
  subtitle: string;
  /** Clickable zone: left, top, width, height, in percent of the scene. */
  spot: readonly [number, number, number, number];
  plaque: PlaqueAnchor;
  /** Background position of the place's tile in the mobile grid, the scene being 1100 px wide. */
  tile: readonly [number, number];
}

/** In the order of the addon's tabs, after the Taverne. */
export const PLACES: readonly Place[] = [
  { id: "raid", name: "Raid", subtitle: "Raids & SR", spot: [49.5, 57, 24, 36], plaque: "table", tile: [-560, -300] },
  {
    id: "dice",
    name: "Le Dé Pipé",
    subtitle: "Paris & deathroll",
    spot: [73.5, 21, 11, 68],
    plaque: "door",
    tile: [-790, -230],
  },
  { id: "quests", name: "Quêtes", subtitle: "Missions", spot: [17.3, 27, 13, 27], plaque: "board", tile: [-175, -125] },
  {
    id: "ranking",
    name: "Ranking",
    subtitle: "Classements & titres",
    spot: [34.6, 26, 14.5, 58],
    plaque: "above",
    tile: [-370, -130],
  },
  {
    id: "artisans",
    name: "Artisans",
    subtitle: "Forge & métiers",
    spot: [85.5, 22, 14, 72],
    plaque: "middle",
    tile: [-935, -300],
  },
  {
    id: "journal",
    name: "Journal",
    subtitle: "Caisse & historique",
    spot: [0.5, 22, 18, 72],
    plaque: "middle",
    tile: [-10, -220],
  },
];

/** The scene: the tavern picture's size, and its lights (left, top, width, height in percent). */
export const TAVERN = {
  width: 1589,
  height: 672,
  lights: [
    { id: "hearth", box: [36, 60, 11, 24], color: "rgba(255, 160, 60, 0.45)", animation: "flick" },
    { id: "door", box: [74.5, 46, 9, 46], color: "rgba(255, 90, 200, 0.4)", animation: "pulse" },
    { id: "forge", box: [89, 56, 9, 24], color: "rgba(255, 150, 50, 0.45)", animation: "flick" },
  ],
} as const;
