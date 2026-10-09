import { redirect } from "next/navigation";
import { EmblemPage } from "@/components/EmblemPage";
import { safeNextPath } from "@/server/nextPath";
import { getCurrentMember } from "@/server/session";

const ERROR_MESSAGES: Record<string, string> = {
  "non-membre": "Ce compte Discord n'est pas sur le serveur Discord de la guilde.",
  requete: "La connexion a été interrompue. Merci de réessayer.",
};

/**
 * The page a visitor sees, with the member guide (/guide, open to all): the charter, without any of the guild's data.
 * "suite" is the page the visitor was going to, shown once signed in.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; suite?: string }>;
}) {
  const { erreur, suite } = await searchParams;
  const next = safeNextPath(suite);
  if (await getCurrentMember()) {
    redirect(next);
  }
  return (
    <EmblemPage title="VXV" error={erreur === undefined ? undefined : ERROR_MESSAGES[erreur]}>
      <p className="mt-6 text-lavender">La taverne est réservée aux membres de la guilde.</p>
      <a
        href={next === "/" ? "/connexion/discord" : `/connexion/discord?suite=${encodeURIComponent(next)}`}
        className="button-pixel mt-8"
      >
        Connexion Discord
      </a>
      <a href="/guide" className="mt-6 inline-block text-amethyst underline">
        Lire le guide du membre
      </a>
    </EmblemPage>
  );
}
