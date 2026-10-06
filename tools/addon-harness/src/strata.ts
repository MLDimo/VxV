/** The client's frame strata, from the lowest: a frame is drawn over every frame of a lower strata, whatever their
 * levels. A frame without a strata of its own lies in UIParent's, MEDIUM. */
const STRATA = ["BACKGROUND", "LOW", "MEDIUM", "HIGH", "DIALOG", "FULLSCREEN", "FULLSCREEN_DIALOG", "TOOLTIP"];

const rank = (strata: unknown) => STRATA.indexOf(typeof strata === "string" ? strata : "MEDIUM");

/** Whether a frame in the upper strata is drawn over a frame in the lower one, nested levels deep as it may be. */
export function drawnAbove(upper: unknown, lower: unknown): boolean {
  return rank(upper) > rank(lower);
}
