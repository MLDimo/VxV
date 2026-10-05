import type { ReactNode } from "react";

const TONES = {
  gain: "bg-gain/14 text-gain",
  gold: "bg-gold/14 text-gold",
  sakura: "bg-sakura/14 text-sakura",
  amethyst: "bg-amethyst/14 text-amethyst",
  muted: "bg-muted/14 text-muted",
} as const;

/** A state badge (§2.5): the color at 14 % behind, the full color for the text, no rounded corner. */
export function Badge({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return <span className={`px-2 py-1 text-xs font-extrabold ${TONES[tone]}`}>{children}</span>;
}
