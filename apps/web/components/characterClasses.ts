/** French names and in-game colors of the class tokens reported by the game. */
const CLASSES: Record<string, { label: string; color: string }> = {
  WARRIOR: { label: "Guerrier", color: "#C69B6D" },
  PALADIN: { label: "Paladin", color: "#F48CBA" },
  HUNTER: { label: "Chasseur", color: "#AAD372" },
  ROGUE: { label: "Voleur", color: "#FFF468" },
  PRIEST: { label: "Prêtre", color: "#FFFFFF" },
  SHAMAN: { label: "Chaman", color: "#0070DD" },
  MAGE: { label: "Mage", color: "#3FC7EB" },
  WARLOCK: { label: "Démoniste", color: "#8788EE" },
  DRUID: { label: "Druide", color: "#FF7C0A" },
};

const UNKNOWN_CLASS_COLOR = "#A1A1AA";

export function classLabel(characterClass: string): string {
  return CLASSES[characterClass]?.label ?? characterClass;
}

export function classColor(characterClass: string): string {
  return CLASSES[characterClass]?.color ?? UNKNOWN_CLASS_COLOR;
}
