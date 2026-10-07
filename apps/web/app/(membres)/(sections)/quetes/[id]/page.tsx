import { canManageRaids, canManageTreasury } from "@vxv/server";
import { formatGold, formatPlace } from "@vxv/server/domain/labels";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberName } from "@/components/MemberName";
import { MissionCard } from "@/components/MissionCard";
import { MissionCloseForm } from "@/components/MissionCloseForm";
import { payReward } from "@/app/actions/missions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";
import { Panel } from "@/components/Panel";

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
        <Panel title="Classement complet" className="mt-8">
          <ol className="mt-3 space-y-1 text-sm">
            {scores.map((score, index) => (
              <li key={score.memberId}>
                {index + 1}. <MemberName name={score.memberName} characterClass={score.memberClass} /> · {score.score}
              </li>
            ))}
          </ol>
        </Panel>
      )}
      {status === "ended" && canManageRaids(member.roles) && (
        <Panel title="Officiers · résultat de la mission" officer className="mt-8">
          <p className="mt-2 text-sm text-lavender">
            Le classement suit les compteurs du jeu ; à égalité, le premier à atteindre le score passe devant.
          </p>
          <MissionCloseForm missionId={mission.id} />
        </Panel>
      )}
      {rewards.length > 0 && (
        <Panel title="Récompenses" className="mt-8">
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
                  <ConfirmButton
                    action={payReward}
                    fields={{ missionId: mission.id, rank: reward.rank }}
                    label="Versée"
                  />
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
