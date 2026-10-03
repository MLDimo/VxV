/** French names of the class tokens reported by the game. */
export const CLASS_LABELS: Readonly<Record<string, string>> = {
  WARRIOR: "Guerrier",
  PALADIN: "Paladin",
  HUNTER: "Chasseur",
  ROGUE: "Voleur",
  PRIEST: "Prêtre",
  SHAMAN: "Chaman",
  MAGE: "Mage",
  WARLOCK: "Démoniste",
  DRUID: "Druide",
};

export function classLabel(characterClass: string): string {
  return CLASS_LABELS[characterClass] ?? characterClass;
}
