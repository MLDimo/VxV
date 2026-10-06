import { MissionForm } from "@/components/MissionForm";
import { ScreenHeader } from "@/components/ScreenHeader";
import { requireOfficer } from "@/server/session";

export default async function NewMissionPage() {
  await requireOfficer();
  return (
    <>
      <ScreenHeader kicker="Le tableau des quêtes · officiers" kickerClassName="text-gain" title="Publier une quête" />
      <MissionForm />
    </>
  );
}
