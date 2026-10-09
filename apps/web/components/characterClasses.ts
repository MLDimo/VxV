import {
  CLASS_COLORS,
  CLASS_COLORS_ON_PARCHMENT,
  UNKNOWN_CLASS_COLOR,
  UNKNOWN_CLASS_COLOR_ON_PARCHMENT,
} from "@vxv/design";

/** The in-game color of a class token: player names are always written in it, darkened on parchment to stay readable. */
export function classColor(characterClass: string, onParchment = false): string {
  return onParchment
    ? (CLASS_COLORS_ON_PARCHMENT[characterClass] ?? UNKNOWN_CLASS_COLOR_ON_PARCHMENT)
    : (CLASS_COLORS[characterClass] ?? UNKNOWN_CLASS_COLOR);
}
