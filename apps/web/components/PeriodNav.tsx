import { RANKING_PERIODS, type RankingPeriod } from "@vxv/server/domain/ranking";
import Link from "next/link";

/** The period in the address: ?periode=mois. */
const PERIOD_PARAMS: Record<RankingPeriod, string> = { always: "toujours", month: "mois", season: "saison" };

/** The period a ranking's address asks for, since always by default. */
export function periodOf(param: string | string[] | undefined): RankingPeriod {
  return RANKING_PERIODS.find((period) => PERIOD_PARAMS[period] === param) ?? "always";
}

/** "Toujours", "Mois", "Saison 2". */
export function periodLabel(period: RankingPeriod, seasonNumber: number | undefined): string {
  if (period === "season") {
    return seasonNumber === undefined ? "Saison" : `Saison ${String(seasonNumber)}`;
  }
  return period === "month" ? "Mois" : "Toujours";
}

/** A ranking's periods (§7.5), side by side in a frame, the current one in gold. */
export function PeriodNav({
  base,
  current,
  seasonNumber,
}: {
  base: string;
  current: RankingPeriod;
  seasonNumber: number | undefined;
}) {
  return (
    <nav
      aria-label="Période"
      className="flex gap-0.5 bg-wood-night p-0.5 shadow-[0_0_0_2px_var(--color-ink),0_0_0_4px_var(--color-beam)]"
    >
      {RANKING_PERIODS.map((candidate) => (
        <Link
          key={candidate}
          href={`${base}?periode=${PERIOD_PARAMS[candidate]}`}
          className={`px-2.5 py-1 text-xs font-bold ${
            candidate === current ? "bg-gold text-banner-ink" : "text-old-paper hover:text-gold"
          }`}
          aria-current={candidate === current ? "page" : undefined}
        >
          {periodLabel(candidate, seasonNumber)}
        </Link>
      ))}
    </nav>
  );
}
