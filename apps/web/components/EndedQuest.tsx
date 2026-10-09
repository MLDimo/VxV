import { MISSION_TYPE_LABELS, type MissionView } from "@vxv/server";
import { endedAgo } from "@vxv/server/domain/missions";
import Link from "next/link";
import { MemberName } from "./MemberName";

/** An ended quest on the board (§7.4): when, its title, and its winner, under its stamp once validated. */
export function EndedQuest({ view, now }: { view: MissionView; now: Date }) {
  const { mission, scores, rewards, status } = view;
  const first = scores[0];
  const winner = rewards.find((reward) => reward.rank === 1) ?? first;
  return (
    <article className="parchment quest-sheet relative flex flex-col gap-1 px-3.5 py-2.5 saturate-75 brightness-90">
      <span className="quest-stamp">{status === "closed" ? "ACCOMPLIE" : "À VALIDER"}</span>
      <span className="text-[10px] font-extrabold tracking-[.14em] text-parchment-muted uppercase">
        {endedAgo(mission.endsAt, now)}
      </span>
      <Link href={`/quetes/${mission.id}`} className="font-pixel text-base text-parchment-ink hover:underline">
        {mission.title}
      </Link>
      <span className="text-xs text-parchment-text">
        {MISSION_TYPE_LABELS[mission.type].name} ·{" "}
        {winner === undefined || first === undefined ? (
          "personne n'a marqué"
        ) : (
          <>
            {status === "closed" ? "gagnée par" : "en tête"}{" "}
            <b>
              <MemberName name={winner.memberName} characterClass={winner.memberClass} onParchment />
            </b>{" "}
            ({first.score})
          </>
        )}
      </span>
    </article>
  );
}
