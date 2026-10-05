import { CLASS_COLORS, UNKNOWN_CLASS_COLOR } from "@vxv/design";

/** The in-game color of a class token: player names are always written in it. */
export function classColor(characterClass: string): string {
  return CLASS_COLORS[characterClass] ?? UNKNOWN_CLASS_COLOR;
}
