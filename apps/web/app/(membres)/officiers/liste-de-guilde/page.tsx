import { RosterImportForm } from "@/components/RosterImportForm";
import { requireOfficer } from "@/server/session";

export default async function RosterImportPage() {
  await requireOfficer();
  return (
    <>
      <h1 className="text-2xl font-bold">Liste de guilde</h1>
      <p className="mt-2 text-zinc-400">
        Collez la liste exportée depuis l&apos;addon. Les nouveaux personnages sont ajoutés, les classes mises à jour,
        et les personnages absents de la liste sont marqués comme ayant quitté la guilde.
      </p>
      <RosterImportForm />
    </>
  );
}
