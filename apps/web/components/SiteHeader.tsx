import { canManageRaids, type Member } from "@vxv/server";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { BurgerMenu } from "./BurgerMenu";
import { rolesLabel } from "./roleLabels";
import { SECTIONS } from "./sections";

const NAV_LINK =
  "whitespace-nowrap font-pixel text-[17px] font-semibold text-[#e9dcc0] hover:text-gold focus-visible:text-gold";

function Links({ member }: { member: Member }) {
  return (
    <>
      {SECTIONS.map((section) => (
        <Link key={section.href} href={section.href} className={NAV_LINK}>
          {section.name}
        </Link>
      ))}
      <Link href="/personnages" className={NAV_LINK}>
        Personnages
      </Link>
      <Link href="/compagnon" className={NAV_LINK}>
        Compagnon
      </Link>
      {canManageRaids(member.roles) && (
        <Link href="/officiers/liste-de-guilde" className={`${NAV_LINK} text-gold`}>
          Liste de guilde
        </Link>
      )}
    </>
  );
}

/** The member and the sign-out; in the bar, the member's name alone, their roles in its tooltip. */
function SignOut({ member, compact = false }: { member: Member; compact?: boolean }) {
  const roles = rolesLabel(member.roles);
  return (
    <form action={signOut} className="flex items-center gap-3">
      <span className="text-sm whitespace-nowrap text-muted" title={compact ? roles : undefined}>
        {compact ? member.discordName : `${member.discordName} · ${roles}`}
      </span>
      <button type="submit" className="button-wood text-sm whitespace-nowrap">
        Se déconnecter
      </button>
    </form>
  );
}

/**
 * The site's header (§5.1): emblem and name, the sections, the member. The full menu needs about 1,400 px since the PvP
 * place; below, the burger menu.
 */
export function SiteHeader({ member }: { member: Member }) {
  return (
    <header className="relative bg-wood-night shadow-[0_3px_0_var(--color-ink),0_6px_0_var(--color-beam)]">
      <nav className="mx-auto flex min-h-[72px] max-w-[1440px] items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-3" aria-label="VXV">
          <Image
            src="/images/emblem.jpg"
            alt=""
            width={36}
            height={36}
            className="image-pixelated size-9 object-cover shadow-[0_0_0_2px_var(--color-amethyst)]"
          />
          <span className="font-pixel text-2xl font-bold text-ivory">VXV</span>
        </Link>
        <div className="hidden flex-1 items-center gap-6 min-[1400px]:flex">
          <Links member={member} />
          <span className="ml-auto">
            <SignOut member={member} compact />
          </span>
        </div>
        <BurgerMenu>
          <Links member={member} />
          <SignOut member={member} />
        </BurgerMenu>
      </nav>
    </header>
  );
}
