import { canManageRaids, type MissionView } from "@vxv/server";
import { formatRemaining } from "@vxv/server/domain/labels";
import Link from "next/link";
import { EndedQuest } from "@/components/EndedQuest";
import { HallOfFame } from "@/components/HallOfFame";
import { MissionCard } from "@/components/MissionCard";
import { Panel } from "@/components/Panel";
import { ScreenHeader } from "@/components/ScreenHeader";
import { UpcomingQuest } from "@/components/UpcomingQuest";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

const BADGE = "px-2.5 py-1 text-xs font-extrabold";

/** When the quest pinned on the board ends, or begins. */
function timing({ mission, status }: MissionView, now: Date): string {
  return status === "running"
    ? `Fin dans ${formatRemaining(mission.endsAt.getTime() - now.getTime())}`
    : `Début dans ${formatRemaining(mission.startsAt.getTime() - now.getTime())}`;
}

/**
 * Quêtes (§7.4, docs/design/maquettes/AddonMissions.html): the quest of the week on its parchment, the quests to come
 * and the ended ones, the hall of fame and the officers' zone.
 */
export default async function QuestsPage() {
  const member = await requireMember();
  const { missions } = getApplication();
  const [views, fame] = await Promise.all([missions.list(), missions.hallOfFame()]);
  const now = new Date();
  const running = views.filter((view) => view.status === "running");
  const upcoming = views.filter((view) => view.status === "upcoming");
  // The board pins the quests running, or the first to come when none runs.
  const pinned = running.length > 0 ? running : upcoming.slice(0, 1);
  const toCome = upcoming.filter((view) => !pinned.includes(view));
  const done = views.filter((view) => view.status === "ended" || view.status === "closed");
  const [first] = pinned;
  return (
    <>
      <ScreenHeader kicker="Le tableau des quêtes" kickerClassName="text-gain" title="Quêtes">
        <span className={`${BADGE} bg-gain/14 text-gain`}>Toute la guilde participe</span>
        {first !== undefined && <span className={`${BADGE} bg-gold/14 text-gold`}>{timing(first, now)}</span>}
      </ScreenHeader>
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_230px]">
        <div className="flex flex-col gap-6">
          {pinned.length === 0 && (
            <Panel title="Quête de la semaine">
              <p className="mt-2 text-lavender">
                Aucune quête en cours : les officiers les publient ici et sur Discord.
              </p>
            </Panel>
          )}
          {pinned.map((view) => (
            <MissionCard key={view.mission.id} view={view} member={member} linked />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Panel
            title="À venir"
            note={toCome[0] && `dans ${formatRemaining(toCome[0].mission.startsAt.getTime() - now.getTime())}`}
            className="flex flex-col gap-2.5"
          >
            {toCome.length === 0 ? (
              <p className="text-sm text-lavender">Rien de prévu pour l&apos;instant.</p>
            ) : (
              toCome.map((view) => <UpcomingQuest key={view.mission.id} view={view} />)
            )}
          </Panel>
          <Panel title="Terminées" className="flex flex-1 flex-col gap-2.5">
            {done.length === 0 ? (
              <p className="text-sm text-lavender">Aucune quête terminée pour l&apos;instant.</p>
            ) : (
              done.map((view) => <EndedQuest key={view.mission.id} view={view} now={now} />)
            )}
          </Panel>
        </div>
        <div className="flex flex-col gap-4">
          <HallOfFame entries={fame} className="flex-1" />
          {canManageRaids(member.roles) && (
            <Panel title="Officier" note="visible par les officiers" officer className="flex flex-col gap-2.5">
              <Link href="/quetes/nouvelle" className="button-wood text-center text-gold">
                Publier une quête
              </Link>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
