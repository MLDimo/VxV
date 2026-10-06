import { canManageRaids, type Member } from "@vxv/server";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { rolesLabel } from "./roleLabels";
import { SECTIONS } from "./sections";

const NAV_LINK = "font-pixel text-[17px] font-semibold text-[#e9dcc0] hover:text-gold focus-visible:text-gold";

function Links({ member }: { member: Member }) {
  return (
    <>
      {SECTIONS.map((section) => (
        <Link key={section.href} href={section.href} className={NAV_LINK}>
          {section.name}
        </Link>
      ))}
      <Link href="/personnages" className={NAV_LINK}>
        Mes personnages
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

function SignOut({ member }: { member: Member }) {
  return (
    <form action={signOut} className="flex items-center gap-3">
      <span className="text-sm text-muted">
        {member.discordName} · {rolesLabel(member.roles)}
      </span>
      <button type="submit" className="button-wood text-sm">
        Se déconnecter
      </button>
    </form>
  );
}

/** The site's header (§5.1): emblem and name, the sections, the member; a burger menu on small screens. */
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
        <div className="hidden flex-1 items-center gap-6 lg:flex">
          <Links member={member} />
          <span className="ml-auto">
            <SignOut member={member} />
          </span>
        </div>
        <details className="group ml-auto lg:hidden">
          <summary
            className="flex size-12 cursor-pointer list-none items-center justify-center bg-wood ring-pixel"
            aria-label="Menu"
          >
            <svg viewBox="0 0 15 15" className="size-5 fill-parchment group-open:fill-gold" aria-hidden="true">
              <rect className="group-open:hidden" x="0" y="1" width="15" height="3" />
              <rect className="group-open:hidden" x="0" y="6" width="15" height="3" />
              <rect className="group-open:hidden" x="0" y="11" width="15" height="3" />
              <rect className="hidden group-open:block" x="6" y="6" width="3" height="3" />
              <rect className="hidden group-open:block" x="0" y="0" width="3" height="3" />
              <rect className="hidden group-open:block" x="12" y="0" width="3" height="3" />
              <rect className="hidden group-open:block" x="0" y="12" width="3" height="3" />
              <rect className="hidden group-open:block" x="12" y="12" width="3" height="3" />
              <rect className="hidden group-open:block" x="3" y="3" width="3" height="3" />
              <rect className="hidden group-open:block" x="9" y="3" width="3" height="3" />
              <rect className="hidden group-open:block" x="3" y="9" width="3" height="3" />
              <rect className="hidden group-open:block" x="9" y="9" width="3" height="3" />
            </svg>
          </summary>
          <div className="absolute inset-x-0 top-[72px] z-20 flex flex-col gap-4 bg-[#24160d] p-6 [&>a]:border-b-2 [&>a]:border-dashed [&>a]:border-beam [&>a]:pb-3 [&>a]:text-[22px]">
            <Links member={member} />
            <SignOut member={member} />
          </div>
        </details>
      </nav>
    </header>
  );
}
