import { MISSION_TYPE_LABELS, type MissionView } from "@vxv/server";
import { formatGold } from "@vxv/server/domain/labels";
import { mostOf } from "@vxv/server/domain/missions";
import Link from "next/link";

/** A quest to come, pinned to the board (§7.4): its title, what counts and its reward. */
export function UpcomingQuest({ view }: { view: MissionView }) {
  const { mission } = view;
  const counted = mostOf(MISSION_TYPE_LABELS[mission.type].counts);
  return (
    <article className="parchment quest-sheet relative flex flex-col gap-1 px-3.5 py-3">
      <span className="quest-pin" aria-hidden />
      <Link href={`/quetes/${mission.id}`} className="font-pixel text-[17px] text-parchment-ink hover:underline">
        {mission.title}
      </Link>
      <span className="text-xs text-parchment-text">
        {counted.charAt(0).toUpperCase() + counted.slice(1)} ·{" "}
        <b className="text-stamp-cash">{formatGold(mission.reward)}</b>
      </span>
    </article>
  );
}
