import type { ColorToken } from "./tokens.ts";

/**
 * The places of the tavern (docs/design/VXV_Design_Spec.md §1 and §4): one place is one tab, with the same name
 * on the website, in the addon and on Discord. Positions are percentages of the scene, so they hold at any size.
 */

/** Where a place's plaque sits relative to its clickable zone. */
export type PlaqueAnchor = "above" | "board" | "middle" | "table" | "door";

export interface Place {
  id: "raid" | "pvp" | "dice" | "quests" | "ranking" | "artisans" | "journal";
  name: string;
  /** Name of the tab in the addon's reduced mode (§7.8), when the place's name is too long. */
  short?: string;
  subtitle: string;
  /** Color token of the kicker above the screen's title (§2.5); the journal has none. */
  kicker: ColorToken | undefined;
  /** Clickable zone: left, top, width, height, in percent of the scene. */
  spot: readonly [number, number, number, number];
  plaque: PlaqueAnchor;
  /** Background position of the place's tile in the mobile grid, the scene being 1100 px wide. */
  tile: readonly [number, number];
  /**
   * Background of the place's screen in the addon (§6): the tavern framed on the place (position in percent, as
   * CSS's background-position, the picture being zoom times as wide as the screen), very dark (opacity).
   */
  backdrop: { position: readonly [number, number]; zoom: number; opacity: number };
}

/** In the order of the addon's tabs, after the Taverne. */
export const PLACES: readonly Place[] = [
  {
    id: "raid",
    name: "Raid",
    subtitle: "Raids & SR",
    kicker: "sakura",
    spot: [49.5, 57, 24, 36],
    plaque: "table",
    tile: [-560, -300],
    backdrop: { position: [60, 85], zoom: 2.6, opacity: 0.3 },
  },
  {
    // The wall of wanted posters (owner's request of 7 October: duels and PvP outings).
    id: "pvp",
    name: "PvP",
    subtitle: "Duels & sorties",
    kicker: "loss",
    spot: [52, 25, 19, 31],
    plaque: "board",
    tile: [-590, -139],
    backdrop: { position: [69, 29], zoom: 2.5, opacity: 0.3 },
  },
  {
    id: "dice",
    name: "Le Dé Pipé",
    short: "Paris",
    subtitle: "Paris & deathroll",
    kicker: "neon",
    spot: [73.5, 21, 11, 68],
    plaque: "door",
    tile: [-790, -230],
    backdrop: { position: [80, 75], zoom: 2.5, opacity: 0.32 },
  },
  {
    id: "quests",
    name: "Quêtes",
    subtitle: "Missions",
    kicker: "gain",
    spot: [17.3, 27, 13, 27],
    plaque: "board",
    tile: [-175, -125],
    backdrop: { position: [22, 45], zoom: 2.5, opacity: 0.3 },
  },
  {
    id: "ranking",
    name: "Ranking",
    subtitle: "Classements & titres",
    kicker: "gold",
    spot: [34.6, 26, 14.5, 58],
    plaque: "above",
    tile: [-370, -130],
    backdrop: { position: [41, 60], zoom: 2.5, opacity: 0.3 },
  },
  {
    id: "artisans",
    name: "Artisans",
    subtitle: "Forge & métiers",
    kicker: "ember",
    spot: [85.5, 22, 14, 72],
    plaque: "middle",
    tile: [-935, -300],
    backdrop: { position: [100, 80], zoom: 2.5, opacity: 0.34 },
  },
  {
    id: "journal",
    name: "Journal",
    subtitle: "Caisse & historique",
    kicker: undefined,
    spot: [0.5, 22, 18, 72],
    plaque: "middle",
    tile: [-10, -220],
    backdrop: { position: [0, 70], zoom: 2.5, opacity: 0.3 },
  },
];

/** The tabs of the addon's reduced mode (§7.8), in order; the other places are behind "…". */
export const COMPACT_PLACES: readonly Place["id"][] = ["raid", "dice", "quests", "ranking"];

/** The cards under the tavern (§5.1, §7.0), in order: a place's news, or what it will bring ("Bientôt"). */
export const TAVERN_CARDS: readonly { place: Place["id"]; kicker: string; soon?: string }[] = [
  { place: "raid", kicker: "Prochain raid" },
  {
    place: "quests",
    kicker: "Quête de la semaine",
    soon: "Le tableau des quêtes ouvre avec les missions de la guilde.",
  },
  { place: "dice", kicker: "Le Dé Pipé", soon: "Paris et deathroll arrivent avec la salle de jeu." },
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
