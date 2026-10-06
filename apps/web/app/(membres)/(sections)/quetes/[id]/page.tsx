import { canManageRaids, canManageTreasury } from "@vxv/server";
import { formatGold, formatPlace } from "@vxv/server/domain/labels";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberName } from "@/components/MemberName";
import { MissionCard } from "@/components/MissionCard";
import { MissionCloseForm } from "@/components/MissionCloseForm";
import { RewardPayment } from "@/components/RewardPayment";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

/** A mission: its parchment, the whole ranking, the officers' validation and the rewards the treasurer hands over. */
export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  const view = await getApplication().missions.find((await params).id);
  if (view === undefined) {
    notFound();
  }
  const { mission, scores, rewards, status } = view;
  return (
    <>
      <ScreenHeader kicker="Le tableau des quêtes" kickerClassName="text-gain" title="Quêtes">
        <Link href="/quetes" className="button-wood">
          Toutes les quêtes
        </Link>
      </ScreenHeader>
      <div className="mt-8">
        <MissionCard view={view} member={member} now={new Date()} />
      </div>
      {scores.length > 5 && (
        <section className="panel mt-8" aria-label="Classement complet">
          <h2 className="font-pixel text-xl text-ivory">Classement complet</h2>
          <ol className="mt-3 space-y-1 text-sm">
            {scores.map((score, index) => (
              <li key={score.memberId}>
                {index + 1}. <MemberName name={score.memberName} characterClass={score.memberClass} /> · {score.score}
              </li>
            ))}
          </ol>
        </section>
      )}
      {status === "ended" && canManageRaids(member.roles) && (
        <section className="panel-officer mt-8">
          <h2 className="font-pixel text-xl text-gold">Officiers · résultat de la mission</h2>
          <p className="mt-2 text-sm text-lavender">
            Le classement suit les compteurs du jeu ; à égalité, le premier à atteindre le score passe devant.
          </p>
          <MissionCloseForm missionId={mission.id} />
        </section>
      )}
      {rewards.length > 0 && (
        <section className="panel mt-8" aria-label="Récompenses">
          <h2 className="font-pixel text-xl text-ivory">Récompenses</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {rewards.map((reward) => (
              <li key={reward.rank} className="flex flex-wrap items-center gap-3">
                <span>
                  {formatPlace(reward.rank)} ·{" "}
                  <MemberName name={reward.memberName} characterClass={reward.memberClass} /> ·{" "}
                  <span className="font-pixel text-gold">{formatGold(reward.amount)}</span> ·{" "}
                  {reward.paidAt === undefined ? "à verser" : "versée"}
                </span>
                {reward.paidAt === undefined && canManageTreasury(member.roles) && (
                  <RewardPayment missionId={mission.id} rank={reward.rank} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
