import type { Member, RankingCategory } from "@vxv/server";
import type { RankingPeriod } from "@vxv/server/domain/ranking";
import type { ReactNode } from "react";
import { getApplication } from "@/server/application";
import { periodLabel, PeriodNav, periodOf } from "./PeriodNav";
import { RankingBoard } from "./RankingBoard";
import { ScreenHeader } from "./ScreenHeader";
import { SubNav } from "./SubNav";

const RECORDS_TITLES: Record<RankingPeriod, string> = {
  always: "Records depuis toujours",
  month: "Records du mois",
  season: "Records de la saison",
};

/** Ranking's categories (§7.5), each its own page. */
const CATEGORIES: readonly { category: RankingCategory; href: string; name: string }[] = [
  { category: "paris", href: "/ranking", name: "Paris" },
  { category: "deathroll", href: "/ranking/deathroll", name: "Deathroll" },
  { category: "quetes", href: "/ranking/quetes", name: "Quêtes" },
  { category: "titres", href: "/ranking/titres", name: "Titres" },
];

/** A Ranking page (§7.5): its categories and periods, the category's board, then what the page adds. */
export async function RankingScreen({
  category,
  member,
  periodParam,
  children,
}: {
  category: RankingCategory;
  member: Member;
  periodParam: string | string[] | undefined;
  children?: ReactNode;
}) {
  const period = periodOf(periodParam);
  const view = await getApplication().ranking.board(category, period);
  const href = CATEGORIES.find((candidate) => candidate.category === category)?.href ?? "/ranking";
  return (
    <>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <ScreenHeader kicker="Au-dessus de la cheminée" kickerClassName="text-gold" title="Ranking" />
        <SubNav label="Catégories" links={CATEGORIES} current={href} />
        <div className="ml-auto">
          <PeriodNav base={href} current={period} seasonNumber={view.season?.number} />
        </div>
      </div>
      {period === "season" && view.season === undefined && (
        <p className="mt-6 text-lavender">Aucune saison lancée : un officier la lance dans la catégorie Paris.</p>
      )}
      <RankingBoard
        board={view}
        memberId={member.id}
        recordsTitle={RECORDS_TITLES[view.period]}
        note={`${view.metric} · ${periodLabel(period, view.season?.number)}`}
        empty="Personne au classement sur cette période."
      />
      {children}
    </>
  );
}
