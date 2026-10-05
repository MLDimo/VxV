import { DEFAULT_SOFT_RESERVES, MAX_SOFT_RESERVES } from "@vxv/server";
import { EventForm } from "@/components/EventForm";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireOfficer } from "@/server/session";

export default async function NewEventPage() {
  await requireOfficer();
  const raids = await getApplication().events.listRaids();
  return (
    <>
      <ScreenHeader kicker="Conseil de guerre · officiers" title="Créer un événement" />
      <EventForm raids={raids} defaultSoftReserves={DEFAULT_SOFT_RESERVES} maxSoftReserves={MAX_SOFT_RESERVES} />
    </>
  );
}
