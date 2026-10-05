import Image from "next/image";
import { redirect } from "next/navigation";
import { CompanionLinkForm } from "@/components/CompanionLinkForm";
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
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <Image
        src="/images/emblem.jpg"
        alt=""
        width={120}
        height={120}
        priority
        className="image-pixelated size-30 object-cover shadow-[0_0_0_2px_var(--color-ink),0_0_0_4px_var(--color-amethyst)]"
      />
      <h1 className="plaque mt-10 text-3xl">Relier le compagnon</h1>
      {request === undefined ? (
        <p className="mt-6 bg-loss/14 px-4 py-3 text-loss">
          Ce lien de liaison n&apos;est pas valide : relance la liaison depuis le compagnon.
        </p>
      ) : (
        <>
          <p className="mt-6 text-lavender">
            Le compagnon VXV de cet ordinateur agira au nom de{" "}
            <strong className="text-ivory">{member.discordName}</strong> : il prépare pour le jeu les données du
            prochain raid et envoie au site ce que l&apos;addon enregistre.
          </p>
          <CompanionLinkForm port={request.port} state={request.state} challenge={request.challenge} />
        </>
      )}
    </main>
  );
}
