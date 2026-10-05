import { RosterImportForm } from "@/components/RosterImportForm";
import { ScreenHeader } from "@/components/ScreenHeader";
import { requireOfficer } from "@/server/session";

export default async function RosterImportPage() {
  await requireOfficer();
  return (
    <>
      <ScreenHeader kicker="Officiers" kickerClassName="text-gold" title="Liste de guilde" />
      <p className="mt-2 text-muted">
        Collez la liste exportée depuis l&apos;addon. Les nouveaux personnages sont ajoutés, les classes mises à jour,
        et les personnages absents de la liste sont marqués comme ayant quitté la guilde.
      </p>
      <RosterImportForm />
    </>
  );
}
