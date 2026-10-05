import Image from "next/image";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/server/nextPath";
import { getCurrentMember } from "@/server/session";

const ERROR_MESSAGES: Record<string, string> = {
  "non-membre": "Ce compte Discord n'est pas sur le serveur Discord de la guilde.",
  requete: "La connexion a été interrompue. Merci de réessayer.",
};

/**
 * The only page a visitor sees: the charter, without any of the guild's data. "suite" is the page the visitor was
 * going to, shown once signed in.
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
  const error = erreur === undefined ? undefined : ERROR_MESSAGES[erreur];
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
      <h1 className="plaque mt-10 text-3xl">VXV</h1>
      <p className="mt-6 text-lavender">La taverne est réservée aux membres de la guilde.</p>
      {error && <p className="mt-6 bg-loss/14 px-4 py-3 text-loss">{error}</p>}
      <a
        href={next === "/" ? "/connexion/discord" : `/connexion/discord?suite=${encodeURIComponent(next)}`}
        className="button-pixel mt-8"
      >
        Connexion Discord
      </a>
    </main>
  );
}
