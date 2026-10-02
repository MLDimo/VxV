import { requireMember } from "@/server/session";

export default async function HomePage() {
  const member = await requireMember();
  return (
    <>
      <h1 className="text-2xl font-bold">Bonjour {member.discordName}</h1>
      <p className="mt-2 text-zinc-400">Les événements de raid arrivent bientôt ici.</p>
    </>
  );
}
