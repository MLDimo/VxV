import { canManageRaids } from "@vxv/server";
import Link from "next/link";
import { HallOfFame } from "@/components/HallOfFame";
import { MissionCard } from "@/components/MissionCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

/** Quêtes (§7.4): the missions running or to come on their parchment, the ended ones, and the hall of fame. */
export default async function QuestsPage() {
  const member = await requireMember();
  const { missions } = getApplication();
  const [views, fame] = await Promise.all([missions.list(), missions.hallOfFame()]);
  const now = new Date();
  const current = views.filter((view) => view.status === "running" || view.status === "upcoming");
  const done = views.filter((view) => view.status === "ended" || view.status === "closed");
  return (
    <>
      <ScreenHeader kicker="Le tableau des quêtes" kickerClassName="text-gain" title="Quêtes">
        {canManageRaids(member.roles) && (
          <Link href="/quetes/nouvelle" className="button-wood text-gold">
            Publier une quête
          </Link>
        )}
      </ScreenHeader>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {current.length === 0 && (
            <p className="text-lavender">Aucune quête en cours : les officiers les publient ici et sur Discord.</p>
          )}
          {current.map((view) => (
            <MissionCard key={view.mission.id} view={view} member={member} now={now} linked />
          ))}
          {done.length > 0 && (
            <section>
              <h2 className="font-pixel text-xl text-ivory">Terminées</h2>
              <div className="mt-4 space-y-6">
                {done.map((view) => (
                  <MissionCard key={view.mission.id} view={view} member={member} now={now} linked />
                ))}
              </div>
            </section>
          )}
        </div>
        <HallOfFame entries={fame} />
      </div>
    </>
  );
}
