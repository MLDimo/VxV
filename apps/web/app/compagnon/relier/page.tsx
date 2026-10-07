import { redirect } from "next/navigation";
import { CompanionLinkForm } from "@/components/CompanionLinkForm";
import { EmblemPage } from "@/components/EmblemPage";
import { parseCompanionLinkRequest } from "@/server/companionLink";
import { getCurrentMember } from "@/server/session";

interface LinkParams {
  port?: string;
  etat?: string;
  defi?: string;
}

/**
 * Opened by the companion in the browser (P7.2): the member, signed in with Discord, confirms that the companion of
 * this computer acts for them. A visitor signs in first, then comes back here.
 */
export default async function CompanionLinkPage({ searchParams }: { searchParams: Promise<LinkParams> }) {
  const params = await searchParams;
  const member = await getCurrentMember();
  if (member === undefined) {
    const here = `/compagnon/relier?${new URLSearchParams({ ...params }).toString()}`;
    redirect(`/connexion?suite=${encodeURIComponent(here)}`);
  }
  const request = parseCompanionLinkRequest(params);
  if (request === undefined) {
    return (
      <EmblemPage
        title="Relier le compagnon"
        error="Ce lien de liaison n'est pas valide : relance la liaison depuis le compagnon."
      />
    );
  }
  return (
    <EmblemPage title="Relier le compagnon">
      <p className="mt-6 text-lavender">
        Le compagnon VXV de cet ordinateur agira au nom de <strong className="text-ivory">{member.discordName}</strong>{" "}
        : il prépare pour le jeu les données du prochain raid et envoie au site ce que l&apos;addon enregistre.
      </p>
      <CompanionLinkForm port={request.port} state={request.state} challenge={request.challenge} />
    </EmblemPage>
  );
}
