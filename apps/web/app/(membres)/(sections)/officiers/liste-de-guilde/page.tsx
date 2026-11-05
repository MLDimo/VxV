import { RosterImportForm } from "@/components/RosterImportForm";
import { ScreenHeader } from "@/components/ScreenHeader";
import { requireOfficer } from "@/server/session";

export default async function RosterImportPage() {
  await requireOfficer();
  return (
    <>
      <ScreenHeader kicker="Officiers" kickerClassName="text-gold" title="Liste de guilde" />
      <p className="mt-2 text-muted">
        La liste se met à jour seule : le compagnon d&apos;un officier l&apos;envoie après chaque /reload ou
        déconnexion. Les nouveaux personnages sont ajoutés, les classes mises à jour, et les personnages absents de la
        liste sont marqués comme ayant quitté la guilde. Une liste qui ferait partir beaucoup de monde d&apos;un coup
        est écartée : si ces départs sont réels, collez ici la liste de <code>/vxv liste</code>.
      </p>
      <RosterImportForm />
    </>
  );
}
