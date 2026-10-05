import { canManageRaids } from "@vxv/server";
import Link from "next/link";
import { RaidNav } from "@/components/RaidNav";
import { ScreenHeader } from "@/components/ScreenHeader";
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

export default async function RaidPage() {
  const member = await requireMember();
  const events = await getApplication().events.listUpcoming();
  return (
    <>
      <ScreenHeader kicker="Conseil de guerre" title="Raids à venir">
        {canManageRaids(member.roles) && (
          <Link href="/evenements/nouveau" className="button-wood text-gold">
            Créer un événement
          </Link>
        )}
      </ScreenHeader>
      <RaidNav current="/raid" />
      <UpcomingEvents events={events} />
    </>
  );
}
