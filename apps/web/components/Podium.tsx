import type { BettorRank } from "@vxv/server";
import { formatSignedGold } from "@vxv/server/domain/labels";
import { Avatar } from "./Avatar";
import { classColor } from "./characterClasses";

/** The metal of each step of the podium (§7.5), by rank. */
const METALS = [
  { name: "Or", color: "var(--color-gold)", height: 330 },
  { name: "Argent", color: "var(--color-silver)", height: 300 },
  { name: "Bronze", color: "var(--color-bronze)", height: 280 },
] as const;
/** Second, first, third, as on a podium; and the banners sway out of step. */
const ORDER = [1, 0, 2] as const;
const SWAY_DELAYS = ["-1.2s", "0s", "-2.4s"] as const;

function Banner({ rank, index }: { rank: BettorRank; index: 0 | 1 | 2 }) {
  const metal = METALS[index];
  const cloth = rank.memberClass === undefined ? "var(--color-muted)" : classColor(rank.memberClass);
  return (
    <li
      className="fanion relative flex w-[150px] flex-col items-center px-4 pt-4 text-center text-[#120A1C]"
      style={{
        height: metal.height,
        animationDelay: SWAY_DELAYS[ORDER.indexOf(index)],
        background: `linear-gradient(90deg, rgba(0,0,0,.18), rgba(255,255,255,.08) 40%, rgba(0,0,0,.15)), ${cloth}`,
      }}
    >
      <span className="absolute inset-y-0 left-2 w-1" style={{ background: metal.color }} />
      <span className="absolute inset-y-0 right-2 w-1" style={{ background: metal.color }} />
      <span className="text-[10px] font-extrabold uppercase">{metal.name}</span>
      <span
        className="mt-2 flex size-[46px] items-center justify-center font-pixel text-2xl"
        style={{ background: metal.color, boxShadow: "0 0 0 2px var(--color-ink)" }}
      >
        {rank.rank}
      </span>
      <span className="mt-3">
        <Avatar characterClass={rank.memberClass} race={rank.memberRace} sex={rank.memberSex} size={72} />
      </span>
      <span className="mt-3 font-pixel text-[21px] leading-tight">{rank.memberName}</span>
      <span className="mt-2 bg-ink px-2 py-1 font-pixel text-gold">{formatSignedGold(rank.net)}</span>
    </li>
  );
}

/** The first three on banners hanging from a wooden rod (§7.5). */
export function Podium({ ranks }: { ranks: BettorRank[] }) {
  return (
    <div>
      <div className="h-[10px] bg-wood shadow-[0_0_0_2px_var(--color-ink)]" />
      <ol className="flex items-start justify-center gap-6" aria-label="Podium">
        {ORDER.flatMap((index) => {
          const rank = ranks[index];
          return rank === undefined ? [] : [<Banner key={rank.memberId} rank={rank} index={index} />];
        })}
      </ol>
    </div>
  );
}
