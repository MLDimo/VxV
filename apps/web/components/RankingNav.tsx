import Link from "next/link";

const LINKS = [
  { href: "/ranking", name: "Paris" },
  { href: "/ranking/titres", name: "Titres" },
] as const;

/** Ranking's categories (§7.5), as tabs. */
export function RankingNav({ current }: { current: (typeof LINKS)[number]["href"] }) {
  return (
    <nav aria-label="Catégories" className="flex gap-3">
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
