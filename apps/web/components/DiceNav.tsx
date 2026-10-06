import Link from "next/link";

const LINKS = [
  { href: "/paris", name: "Paris" },
  { href: "/paris/deathroll", name: "Deathroll" },
  { href: "/paris/tresorerie", name: "Trésorerie" },
] as const;

/** Le Dé Pipé's sub-menu (§7.2: same style as the tabs). */
export function DiceNav({ current }: { current?: (typeof LINKS)[number]["href"] }) {
  return (
    <nav aria-label="Le Dé Pipé" className="mt-6 flex gap-3">
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
