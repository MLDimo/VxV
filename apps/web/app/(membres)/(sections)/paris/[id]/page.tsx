import { canManageRaids } from "@vxv/server";
import { standing } from "@vxv/server/domain/bets";
import { formatDateTime, formatGold, STAKE_STANDING_LABELS } from "@vxv/server/domain/labels";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BetEndForm } from "@/components/BetEndForm";
import { BetTable } from "@/components/BetTable";
import { DiceNav } from "@/components/DiceNav";
import { MemberName } from "@/components/MemberName";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";
import { Panel } from "@/components/Panel";

const OUTCOMES = { won: "Gagné", lost: "Perdu", refunded: "Remboursé" } as const;

/** A bet: its table, every stake as everybody sees it (§11: transparent bets), and the officers' result. */
export default async function BetPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  const view = await getApplication().bets.find((await params).id);
  if (view === undefined) {
    notFound();
  }
  const { bet, stakes } = view;
  const labels = new Map(bet.choices.map((choice) => [choice.id, choice.label]));
  const ended = bet.endedAt !== undefined;
  return (
    <>
      <ScreenHeader kicker="La salle de jeu" kickerClassName="text-neon" title="Le Dé Pipé">
        <Link href="/paris" className="button-wood">
          Tous les paris
        </Link>
      </ScreenHeader>
      <DiceNav />
      <div className="mt-8">
        <BetTable view={view} member={member} />
      </div>
      <Panel title="Les mises" className="mt-8">
        {stakes.length === 0 ? (
          <p className="mt-3 text-lavender">Aucune mise pour l&apos;instant.</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs text-muted uppercase">
              <tr>
                <th className="py-2 pr-3">Joueur</th>
                <th className="py-2 pr-3">Choix</th>
                <th className="py-2 pr-3">Mise</th>
                {ended && <th className="py-2 pr-3">Résultat</th>}
                <th className="py-2 pr-3">Statut</th>
                <th className="py-2">Le</th>
              </tr>
            </thead>
            <tbody>
              {stakes.map((stake) => (
                <tr key={stake.id}>
                  <td className="py-1 pr-3">
                    <MemberName name={stake.memberName} characterClass={stake.memberClass} />
                  </td>
                  <td className="py-1 pr-3">{labels.get(stake.choiceId)}</td>
                  <td className="py-1 pr-3">{formatGold(stake.amount)}</td>
                  {ended && (
                    <td className="py-1 pr-3">
                      {stake.outcome === undefined ? "—" : OUTCOMES[stake.outcome]}
                      {stake.outcome === "won" && stake.gain !== undefined && ` (${formatGold(stake.gain)})`}
                    </td>
                  )}
                  <td className="py-1 pr-3">{STAKE_STANDING_LABELS[standing(stake)]}</td>
                  <td className="py-1">{formatDateTime(stake.placedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      {!ended && canManageRaids(member.roles) && (
        <Panel title="Officiers · résultat du pari" officer className="mt-8">
          <p className="mt-2 text-sm text-lavender">
            Le résultat termine le pari : les gains sont calculés et la part de l&apos;organisation entre dans la
            caisse. Annuler rend chaque mise.
          </p>
          <BetEndForm betId={bet.id} choices={bet.choices} />
        </Panel>
      )}
    </>
  );
}
