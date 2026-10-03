import { DEFAULT_SOFT_RESERVES, MAX_SOFT_RESERVES } from "@vxv/server";
import { EventForm } from "@/components/EventForm";
import { getApplication } from "@/server/application";
import { requireOfficer } from "@/server/session";

export default async function NewEventPage() {
  await requireOfficer();
  const raids = await getApplication().events.listRaids();
  return (
    <>
      <h1 className="text-2xl font-bold">Créer un événement</h1>
      <EventForm raids={raids} defaultSoftReserves={DEFAULT_SOFT_RESERVES} maxSoftReserves={MAX_SOFT_RESERVES} />
    </>
  );
}
