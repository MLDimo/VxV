/** In-game colors of the class tokens reported by the game. */
const CLASS_COLORS: Record<string, string> = {
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

const UNKNOWN_CLASS_COLOR = "#A1A1AA";

export function classColor(characterClass: string): string {
  return CLASS_COLORS[characterClass] ?? UNKNOWN_CLASS_COLOR;
}
