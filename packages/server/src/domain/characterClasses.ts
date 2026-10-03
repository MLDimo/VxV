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

/** Discord roles named after the classes: a member holds the one of their main character. */
export const CLASS_ROLE_NAMES: readonly string[] = Object.values(CLASS_LABELS);

export function classLabel(characterClass: string): string {
  return CLASS_LABELS[characterClass] ?? characterClass;
}
