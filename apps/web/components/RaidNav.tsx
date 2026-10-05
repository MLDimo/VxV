import Link from "next/link";

const LINKS = [
  { href: "/raid", name: "Prochains raids" },
  { href: "/historique", name: "Historique" },
] as const;

/** The Raid section's sub-menu (§7.2: same style as the tabs). */
export function RaidNav({ current }: { current: (typeof LINKS)[number]["href"] }) {
  return (
    <nav aria-label="Raid" className="mt-6 flex gap-3">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="tab"
          aria-current={link.href === current ? "page" : undefined}
        >
          {link.name}
        </Link>
      ))}
    </nav>
  );
}
