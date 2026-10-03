import { redirect } from "next/navigation";
import { getCurrentMember } from "@/server/session";

const ERROR_MESSAGES: Record<string, string> = {
  "non-membre": "Ce compte Discord n'est pas sur le serveur Discord de la guilde.",
  requete: "La connexion a été interrompue. Merci de réessayer.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  if (await getCurrentMember()) {
    redirect("/");
  }
  const { erreur } = await searchParams;
  const error = erreur === undefined ? undefined : ERROR_MESSAGES[erreur];
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">VXV</h1>
      <p className="mt-2 text-zinc-400">Réservé aux membres de la guilde.</p>
      {error && <p className="mt-6 rounded bg-red-950 px-4 py-3 text-red-200">{error}</p>}
      <a
        href="/connexion/discord"
        className="mt-8 inline-block rounded bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500"
      >
        Se connecter avec Discord
      </a>
    </main>
  );
}
