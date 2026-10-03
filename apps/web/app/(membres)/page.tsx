import { canManageRaids } from "@vxv/server";
import Link from "next/link";
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

export default async function HomePage() {
  const member = await requireMember();
  const events = await getApplication().events.listUpcoming();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Raids à venir</h1>
        {canManageRaids(member.roles) && (
          <Link
            href="/evenements/nouveau"
            className="rounded bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500"
          >
            Créer un événement
          </Link>
        )}
      </div>
      <UpcomingEvents events={events} />
    </>
  );
}
