import { BetForm } from "@/components/BetForm";
import { ScreenHeader } from "@/components/ScreenHeader";
import { requireOfficer } from "@/server/session";

export default async function NewBetPage() {
  await requireOfficer();
  return (
    <>
      <ScreenHeader kicker="La salle de jeu · officiers" kickerClassName="text-neon" title="Ouvrir un pari" />
      <BetForm />
    </>
  );
}
