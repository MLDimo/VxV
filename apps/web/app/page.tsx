import { signOut } from "@/app/actions/auth";
import { ROLE_LABELS } from "@/components/roleLabels";
import { requireMember } from "@/server/session";

export default async function HomePage() {
  const member = await requireMember();
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">VXV</h1>
        <form action={signOut}>
          <button type="submit" className="text-sm text-zinc-400 hover:text-zinc-100">
            Se déconnecter
          </button>
        </form>
      </header>
      <p className="mt-6">
        Bonjour {member.discordName} <span className="text-zinc-400">({ROLE_LABELS[member.role]})</span>
      </p>
    </main>
  );
}
