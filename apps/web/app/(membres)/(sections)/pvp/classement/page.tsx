import { ELO_K, ELO_START } from "@vxv/server";
import { MemberName } from "@/components/MemberName";
import { PvpNav } from "@/components/PvpNav";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

/** The duelists' Elo ranking, from every duel played. */
export default async function DuelRankingPage() {
  await requireMember();
  const lines = await getApplication().duels.ranking();
  return (
    <>
      <ScreenHeader kicker="Avis de recherche" kickerClassName="text-loss" title="Classement des duels" />
      <PvpNav current="/pvp/classement" />
      <p className="mt-6 max-w-3xl text-lavender">
        Classement Elo : chacun part de {ELO_START} ; après un duel, le vainqueur gagne {ELO_K} × (1 − la chance
        qu&apos;il avait de gagner), le perdant les perd. Battre un plus fort rapporte beaucoup, un plus faible peu.
      </p>
      {lines.length === 0 ? (
        <p className="mt-8 text-muted">Aucun duel joué pour l&apos;instant.</p>
      ) : (
        <table className="panel mt-8 w-full max-w-3xl text-left">
          <thead className="text-sm text-muted">
            <tr>
              <th className="py-2">Rang</th>
              <th>Joueur</th>
              <th className="text-right">Elo</th>
              <th className="text-right">Victoires</th>
              <th className="text-right">Duels</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.member.memberId} className="border-t border-line">
                <td className="py-2 font-pixel">{line.rank}</td>
                <td>
                  <MemberName name={line.member.name} characterClass={line.member.characterClass} />
                </td>
                <td className="text-right font-pixel text-gold">{line.rating}</td>
                <td className="text-right">{line.won}</td>
                <td className="text-right">{line.played}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
