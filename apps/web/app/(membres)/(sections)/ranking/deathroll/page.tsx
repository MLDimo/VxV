import { formatGold, formatSignedGold } from "@vxv/server/domain/labels";
import { MemberName } from "@/components/MemberName";
import { PeriodNav, periodOf } from "@/components/PeriodNav";
import { RankingNav } from "@/components/RankingNav";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

/** Ranking · Deathroll (P15.7): net gain, games played and biggest win, since always, this month or this season. */
export default async function DeathrollRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string | string[] }>;
}) {
  const member = await requireMember();
  const period = periodOf((await searchParams).periode);
  const { season, rows } = await getApplication().deathrolls.ranking(period);
  return (
    <>
      <ScreenHeader kicker="Au-dessus de la cheminée" kickerClassName="text-gold" title="Ranking" />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <RankingNav current="/ranking/deathroll" />
        <PeriodNav base="/ranking/deathroll" current={period} />
      </div>
      {rows.length === 0 ? (
        <p className="mt-8 text-lavender">
          {period === "season" && season === undefined
            ? "Aucune saison lancée : un officier la lance dans la catégorie Paris."
            : "Aucun deathroll terminé sur cette période."}
        </p>
      ) : (
        <section className="panel mt-8" aria-label="Classement du deathroll">
          <h2 className="font-pixel text-xl text-ivory">Classement du deathroll</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted uppercase">
              <tr>
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Joueur</th>
                <th className="py-2 pr-3">Gain net</th>
                <th className="py-2 pr-3">Parties</th>
                <th className="py-2">Plus grosse victoire</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.memberId}
                  className={
                    row.memberId === member.id
                      ? "bg-amethyst/16 shadow-[inset_0_0_0_2px_var(--color-amethyst)]"
                      : "odd:bg-amethyst/6"
                  }
                >
                  <td className="py-1 pr-2 font-pixel text-lg">{row.rank}</td>
                  <th scope="row" className="py-1 pr-2 text-left font-normal">
                    <MemberName name={row.memberName} characterClass={row.memberClass} />
                  </th>
                  <td className={`py-1 pr-3 font-pixel ${row.net >= 0 ? "text-gain" : "text-loss"}`}>
                    {formatSignedGold(row.net)}
                  </td>
                  <td className="py-1 pr-3">{row.games}</td>
                  <td className="py-1">{formatGold(row.biggestWin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
