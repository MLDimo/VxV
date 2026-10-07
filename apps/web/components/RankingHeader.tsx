import type { RankingPeriod } from "@vxv/server/domain/ranking";
import type { ReactNode } from "react";
import { PeriodNav } from "./PeriodNav";
import { ScreenHeader } from "./ScreenHeader";
import { SubNav } from "./SubNav";

const CATEGORIES = [
  { href: "/ranking", name: "Paris" },
  { href: "/ranking/deathroll", name: "Deathroll" },
  { href: "/ranking/titres", name: "Titres" },
] as const;

/** The style of a ranking's row, the player's own standing out. */
export function rankingRowClass(mine: boolean): string {
  return mine ? "bg-amethyst/16 shadow-[inset_0_0_0_2px_var(--color-amethyst)]" : "odd:bg-amethyst/6";
}

/** The head of Ranking's pages (§7.5): the screen's title and badges, its categories, and the ranking's periods. */
export function RankingHeader({
  category,
  period,
  children,
}: {
  category: (typeof CATEGORIES)[number]["href"];
  /** The period shown, for a ranking over periods. */
  period?: RankingPeriod;
  children?: ReactNode;
}) {
  return (
    <>
      <ScreenHeader kicker="Au-dessus de la cheminée" kickerClassName="text-gold" title="Ranking">
        {children}
      </ScreenHeader>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <SubNav label="Catégories" links={CATEGORIES} current={category} />
        {period !== undefined && <PeriodNav base={category} current={period} />}
      </div>
    </>
  );
}
