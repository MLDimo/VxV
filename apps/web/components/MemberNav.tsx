import { canManageRaids, type Member } from "@vxv/server";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { ROLE_LABELS } from "./roleLabels";

export function MemberNav({ member }: { member: Member }) {
  return (
    <header className="border-b border-zinc-800">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          VXV
        </Link>
        <Link href="/personnages" className="text-zinc-300 hover:text-white">
          Mes personnages
        </Link>
        <Link href="/historique" className="text-zinc-300 hover:text-white">
          Historique
        </Link>
        <Link href="/journal" className="text-zinc-300 hover:text-white">
          Journal
        </Link>
        {canManageRaids(member.role) && (
          <Link href="/officiers/liste-de-guilde" className="text-zinc-300 hover:text-white">
            Liste de guilde
          </Link>
        )}
        <span className="ml-auto text-sm text-zinc-400">
          {member.discordName} · {ROLE_LABELS[member.role]}
        </span>
        <form action={signOut}>
          <button type="submit" className="text-sm text-zinc-400 hover:text-white">
            Se déconnecter
          </button>
        </form>
      </nav>
    </header>
  );
}
