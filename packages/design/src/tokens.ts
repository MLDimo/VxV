/**
 * The design tokens of VXV, from docs/design/VXV_Design_Spec.md (§2): the single source of the colors and fonts of
 * the website, the companion and the addon. Change them here, then run npm run generate.
 */

/** Interface colors (§2.1) and tavern colors (§2.2), by token name. */
export const COLORS = {
  // VXV interface
  amethyst: "#A35CFF",
  "amethyst-button": "#8A3FFC",
  "amethyst-shade": "#5A1FB0",
  "amethyst-light": "#B98CFF",
  sakura: "#E0479E",
  "sakura-light": "#FF8CC8",
  gold: "#F2C94C",
  "gold-shade": "#B8860B",
  "gold-light": "#FFF2B0",
  night: "#0B0814",
  "night-window": "#0E0A16",
  ink: "#0D0912",
  panel: "rgba(18, 13, 26, 0.88)",
  card: "#1A1222",
  alert: "#2A1030",
  "panel-officer": "rgba(42, 26, 10, 0.9)",
  ivory: "#F4EFFC",
  lavender: "#C9C2EA",
  muted: "#A49BBD",
  line: "#2E2442",
  gain: "#7EE2A0",
  loss: "#F19A9A",
  epic: "#C58BFF",
  // Tavern: frames, plaques, parchment
  "wood-night": "#1A0F0A",
  wood: "#3A2414",
  "wood-shade": "#1A0F08",
  "wood-tab": "#2A1A10",
  beam: "#5B3A1C",
  copper: "#8A5A2A",
  plum: "#4A2A6A",
  parchment: "#F8E7C0",
  "old-paper": "#D9C39A",
  "ink-brown": "#3A2614",
  // The quests' parchment (§7.4): its titles, its text, its notes, and the ink of the guild's seal
  "parchment-ink": "#2A1A0C",
  "parchment-text": "#4A3220",
  "parchment-muted": "#6B4A2A",
  seal: "#6A22C8",
  ember: "#FFA03C",
  neon: "#FF5AC8",
  // Le Dé Pipé (§7.2): the felt of the gaming table, from its lit centre to its edge
  felt: "#3B1C5E",
  "felt-mid": "#24123B",
  "felt-edge": "#170C27",
  // Accounts book (§7.7): leather cover, ruled pages and the inks of the stamps
  leather: "#4A2414",
  "leather-shade": "#2E140A",
  ruling: "rgba(120, 80, 30, 0.22)",
  "stamp-loot": "#7A2FE0",
  "stamp-cash": "#8A5A0E",
  "stamp-quest": "#2E7A44",
  "stamp-bet": "#B0306E",
  "stamp-raid": "#3A5AA0",
  "ink-gain": "#2E7A44",
  "ink-loss": "#8A1F2C",
  // Ranking (§7.5): the podium's metals, the banners' ink and titles, and the ground behind the portraits (§8)
  silver: "#D9DBE6",
  bronze: "#D08A5A",
  "banner-ink": "#120A1C",
  "banner-title": "#5A0F3A",
  "avatar-ground": "#141828",
} as const;

export type ColorToken = keyof typeof COLORS;

/** Class colors (§2.3): player names are always written in their class color, and nothing else uses them. */
export const CLASS_COLORS: Readonly<Record<string, string>> = {
  WARRIOR: "#C69B6D",
  PALADIN: "#F48CBA",
  HUNTER: "#AAD372",
  ROGUE: "#FFF468",
  PRIEST: "#FFFFFF",
  SHAMAN: "#0070DD",
  MAGE: "#3FC7EB",
  WARLOCK: "#8788EE",
  DRUID: "#FF7C0A",
};

/** A class token this version does not know is written in the secondary text color. */
export const UNKNOWN_CLASS_COLOR = COLORS.muted;

/** How much of its class's color a name keeps on parchment, the rest being the parchment's ink (contrast 4:1 at least). */
const ON_PARCHMENT = 0.3;
const HEX = 16;

/** A color mixed with another: share of the first, the rest of the second ("#RRGGBB"). */
function mix(color: string, other: string, share: number): string {
  const channel = (hex: string, index: number) => Number.parseInt(hex.slice(1 + 2 * index, 3 + 2 * index), HEX);
  return `#${[0, 1, 2]
    .map((index) =>
      Math.round(channel(color, index) * share + channel(other, index) * (1 - share))
        .toString(HEX)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;
}

/** Class colors on parchment (§7.4): each darkened with the parchment's ink, so that names stay readable on it. */
export const CLASS_COLORS_ON_PARCHMENT: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(CLASS_COLORS).map(([token, color]) => [token, mix(color, COLORS["parchment-ink"], ON_PARCHMENT)]),
);
export const UNKNOWN_CLASS_COLOR_ON_PARCHMENT = COLORS["parchment-muted"];

/** A color ("#A35CFF") as a number, as Discord takes it for a message's embed or a role. */
export function colorValue(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}

/** The two fonts (§2.4), self-hosted: Pixelify Sans for titles, tabs and big numbers, Manrope for text. */
export const FONTS = {
  pixel: { family: "Pixelify Sans", file: "pixelify-sans", weights: [500, 600, 700], fallback: "monospace" },
  text: { family: "Manrope", file: "manrope", weights: [400, 600, 700, 800], fallback: "system-ui, sans-serif" },
} as const;
