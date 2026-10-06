import { notFound } from "next/navigation";
import { formatDateTime, formatGold } from "@vxv/server/domain/labels";
import Link from "next/link";
import { BetTable } from "@/components/BetTable";
import { MemberName } from "@/components/MemberName";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

/** A bet: its table, and every stake, as everybody sees them (§11: transparent bets). */
export default async function BetPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  const view = await getApplication().bets.find((await params).id);
  if (view === undefined) {
    notFound();
  }
  const labels = new Map(view.bet.choices.map((choice) => [choice.id, choice.label]));
  return (
    <>
      <ScreenHeader kicker="La salle de jeu" kickerClassName="text-neon" title="Le Dé Pipé">
        <Link href="/paris" className="button-wood">
          Tous les paris
        </Link>
      </ScreenHeader>
      <div className="mt-8">
        <BetTable view={view} member={member} />
      </div>
      <section className="panel mt-8">
        <h2 className="font-pixel text-xl text-ivory">Les mises</h2>
        {view.stakes.length === 0 ? (
          <p className="mt-3 text-lavender">Aucune mise pour l&apos;instant.</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs text-muted uppercase">
              <tr>
                <th className="py-2 pr-3">Joueur</th>
                <th className="py-2 pr-3">Choix</th>
                <th className="py-2 pr-3">Mise</th>
                <th className="py-2 pr-3">Statut</th>
                <th className="py-2">Le</th>
              </tr>
            </thead>
            <tbody>
              {view.stakes.map((stake) => (
                <tr key={stake.id}>
                  <td className="py-1 pr-3">
                    <MemberName name={stake.memberName} characterClass={stake.memberClass} />
                  </td>
                  <td className="py-1 pr-3">{labels.get(stake.choiceId)}</td>
                  <td className="py-1 pr-3">{formatGold(stake.amount)}</td>
                  <td className="py-1 pr-3">{stake.paidAt === undefined ? "À payer" : "Payée"}</td>
                  <td className="py-1">{formatDateTime(stake.placedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
