import { SubNav } from "./SubNav";

const LINKS = [
  { href: "/pvp", name: "Sorties" },
  { href: "/pvp/duels", name: "Duels" },
  { href: "/pvp/classement", name: "Classement" },
] as const;

/** The PvP place's sub-menu. */
export function PvpNav({ current }: { current?: (typeof LINKS)[number]["href"] }) {
  return <SubNav label="PvP" links={LINKS} current={current} className="mt-6" />;
}
