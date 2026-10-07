import { SubNav } from "./SubNav";

const LINKS = [
  { href: "/paris", name: "Paris" },
  { href: "/paris/deathroll", name: "Deathroll" },
  { href: "/paris/tresorerie", name: "Trésorerie" },
] as const;

/** Le Dé Pipé's sub-menu. */
export function DiceNav({ current }: { current?: (typeof LINKS)[number]["href"] }) {
  return <SubNav label="Le Dé Pipé" links={LINKS} current={current} className="mt-6" />;
}
