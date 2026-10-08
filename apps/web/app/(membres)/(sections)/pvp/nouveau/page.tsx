import { MAX_EVENT_TITLE_LENGTH } from "@vxv/server";
import { PvpEventForm } from "@/components/PvpEventForm";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireOfficer } from "@/server/session";

export default async function NewPvpEventPage() {
  await requireOfficer();
  const roles = await getApplication().events.listRoleChoices();
  return (
    <>
      <ScreenHeader kicker="Avis de recherche · officiers" kickerClassName="text-loss" title="Créer un événement PvP" />
      <PvpEventForm roles={roles} maxTitleLength={MAX_EVENT_TITLE_LENGTH} />
    </>
  );
}
