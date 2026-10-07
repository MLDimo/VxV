import { SubNav } from "./SubNav";

const LINKS = [
  { href: "/raid", name: "Prochains raids" },
  { href: "/historique", name: "Historique" },
] as const;

/** The Raid section's sub-menu. */
export function RaidNav({ current }: { current?: (typeof LINKS)[number]["href"] }) {
  return <SubNav label="Raid" links={LINKS} current={current} className="mt-6" />;
}
