import { RANKING_PERIODS, type RankingPeriod } from "@vxv/server/domain/ranking";
import Link from "next/link";

const PERIOD_LABELS: Record<RankingPeriod, string> = { always: "Depuis toujours", month: "Ce mois", season: "Saison" };
/** The period in the address: ?periode=mois. */
const PERIOD_PARAMS: Record<RankingPeriod, string> = { always: "toujours", month: "mois", season: "saison" };

/** The period a ranking's address asks for, since always by default. */
export function periodOf(param: string | string[] | undefined): RankingPeriod {
  return RANKING_PERIODS.find((period) => PERIOD_PARAMS[period] === param) ?? "always";
}

/** A ranking's periods (§7.5): since always, this month, this season. */
export function PeriodNav({ base, current }: { base: string; current: RankingPeriod }) {
  return (
    <nav aria-label="Période" className="flex gap-2">
      {RANKING_PERIODS.map((candidate) => (
        <Link
          key={candidate}
          href={`${base}?periode=${PERIOD_PARAMS[candidate]}`}
          className={candidate === current ? "button-gold" : "button-wood"}
          aria-current={candidate === current ? "page" : undefined}
        >
          {PERIOD_LABELS[candidate]}
        </Link>
      ))}
    </nav>
  );
}
