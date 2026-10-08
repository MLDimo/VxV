import { canManageRaids } from "@vxv/server";
import Link from "next/link";
import { PvpNav } from "@/components/PvpNav";
import { ScreenHeader } from "@/components/ScreenHeader";
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

/** The wall of wanted posters: the PvP outings to come; the duels and their ranking behind its sub-menu. */
export default async function PvpPage() {
  const member = await requireMember();
  const events = await getApplication().events.listUpcoming("pvp");
  return (
    <>
      <ScreenHeader kicker="Avis de recherche" kickerClassName="text-loss" title="Sorties PvP">
        {canManageRaids(member.roles) && (
          <Link href="/pvp/nouveau" className="button-wood text-gold">
            Créer une sortie
          </Link>
        )}
      </ScreenHeader>
      <PvpNav current="/pvp" />
      <UpcomingEvents events={events} empty="Aucune sortie PvP prévue pour l'instant." />
    </>
  );
}
