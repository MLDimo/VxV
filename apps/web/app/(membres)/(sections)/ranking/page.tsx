import { canManageRaids, type BettorRank } from "@vxv/server";
import { formatDateTime, formatGold, formatShare, formatSignedGold } from "@vxv/server/domain/labels";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { MemberName } from "@/components/MemberName";
import { periodOf } from "@/components/PeriodNav";
import { Podium } from "@/components/Podium";
import { RankingHeader, rankingRowClass } from "@/components/RankingHeader";
import { SeasonForm } from "@/components/SeasonForm";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";
import { Panel } from "@/components/Panel";

function Row({ rank, mine, widest }: { rank: BettorRank; mine: boolean; widest: number }) {
  return (
    <tr className={rankingRowClass(mine)}>
      <td className="py-1 pr-2 font-pixel text-lg">{rank.rank}</td>
      <td className="py-1 pr-2">
        <Avatar characterClass={rank.memberClass} race={rank.memberRace} sex={rank.memberSex} size={32} />
      </td>
      <th scope="row" className="py-1 pr-2 text-left font-normal">
        <MemberName name={rank.memberName} characterClass={rank.memberClass} />
        {rank.debt > 0 && <span className="ml-2 text-xs font-extrabold text-loss">Dette {formatGold(rank.debt)}</span>}
      </th>
      <td className="w-24 py-1 pr-2">
        <span
          className={`block h-2 ${rank.net >= 0 ? "bg-gain" : "bg-loss"}`}
          style={{ width: `${String(widest === 0 ? 0 : Math.round((Math.abs(rank.net) / widest) * 100))}%` }}
        />
      </td>
      <td className={`py-1 pr-3 font-pixel ${rank.net >= 0 ? "text-gain" : "text-loss"}`}>
        {formatSignedGold(rank.net)}
      </td>
      <td className="py-1 pr-3">{formatGold(rank.won)}</td>
      <td className="py-1 pr-3">{rank.bets}</td>
      <td className="py-1">{formatShare(rank.successRate)}</td>
    </tr>
  );
}

/** Ranking (§7.5): the bettors, since always, this month or this season. */
export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string | string[] }>;
}) {
  const member = await requireMember();
  const period = periodOf((await searchParams).periode);
  const { season, bettors } = await getApplication().ranking.bettors(period);
  const widest = Math.max(0, ...bettors.map((rank) => Math.abs(rank.net)));
  const mine = bettors.find((rank) => rank.memberId === member.id);
  return (
    <>
      <RankingHeader category="/ranking" period={period}>
        <Badge tone="gold">
          {season === undefined
            ? "Aucune saison lancée"
            : `Saison ${String(season.number)} · lancée le ${formatDateTime(season.startedAt)}`}
        </Badge>
      </RankingHeader>
      {bettors.length === 0 ? (
        <p className="mt-8 text-lavender">
          {period === "season" && season === undefined
            ? "Aucune saison lancée : un officier la lance ici."
            : "Aucun pari terminé sur cette période."}
        </p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[auto_1fr]">
          <Podium ranks={bettors.slice(0, 3)} />
          <Panel title="Classement des parieurs">
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-muted uppercase">
                <tr>
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2" />
                  <th className="py-2 pr-2">Joueur</th>
                  <th className="py-2 pr-2" />
                  <th className="py-2 pr-3">Gain net</th>
                  <th className="py-2 pr-3">Total gagné</th>
                  <th className="py-2 pr-3">Paris</th>
                  <th className="py-2">Réussite</th>
                </tr>
              </thead>
              <tbody>
                {bettors.map((rank) => (
                  <Row key={rank.memberId} rank={rank} mine={rank.memberId === member.id} widest={widest} />
                ))}
              </tbody>
              {mine !== undefined && (
                <tfoot>
                  <tr>
                    <td colSpan={8} className="pt-4 text-xs text-muted uppercase">
                      Ta position
                    </td>
                  </tr>
                  <Row rank={mine} mine widest={widest} />
                </tfoot>
              )}
            </table>
          </Panel>
        </div>
      )}
      {canManageRaids(member.roles) && (
        <Panel title="Officiers · saisons" officer className="mt-10">
          <p className="mt-2 text-sm text-lavender">
            Une nouvelle saison remet à zéro les classements « Saison » ; les autres périodes ne changent pas.
          </p>
          <SeasonForm />
        </Panel>
      )}
    </>
  );
}
