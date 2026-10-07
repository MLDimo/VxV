import { DEFAULT_SOFT_RESERVES, MAX_SOFT_RESERVES } from "@vxv/server";
import { EventForm } from "@/components/EventForm";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireOfficer } from "@/server/session";

export default async function NewEventPage() {
  await requireOfficer();
  const { events } = getApplication();
  const [raids, roles] = await Promise.all([events.listRaids(), events.listRoleChoices()]);
  return (
    <>
      <ScreenHeader kicker="Conseil de guerre · officiers" title="Créer un événement" />
      <EventForm
        raids={raids}
        roles={roles}
        defaultSoftReserves={DEFAULT_SOFT_RESERVES}
        maxSoftReserves={MAX_SOFT_RESERVES}
      />
    </>
  );
}
