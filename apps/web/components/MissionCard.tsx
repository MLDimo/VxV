import { MISSION_TYPE_LABELS, REWARD_SHARES, type Member, type MissionView } from "@vxv/server";
import { formatGold, formatPlace } from "@vxv/server/domain/labels";
import { missionPitch, missionProgress } from "@vxv/server/domain/missions";
import Link from "next/link";
import { MemberName } from "./MemberName";

/** The first five of the ranking (§7.4). */
const SHOWN_SCORES = 5;
const PERCENT = 100;
/** Under the seal, the stamp of a quest accomplished. */
const STAMP_TOP = "96px";

const KICKERS: Record<MissionView["status"], string> = {
  upcoming: "Quête à venir",
  running: "Quête de la semaine",
  ended: "Quête terminée",
  closed: "Quête accomplie",
};

/** The guild's seal on a quest's parchment (§7.4). */
function Seal() {
  return (
    <div className="quest-seal" role="img" aria-label="Tampon de la guilde VXV : approuvé">
      <i className="text-[7px] leading-none font-extrabold tracking-[.18em] not-italic">★ GUILDE ★</i>
      <b className="font-pixel text-xl leading-none tracking-[.06em]">VXV</b>
      <i className="text-[7px] leading-none font-extrabold tracking-[.18em] not-italic">APPROUVÉ</i>
    </div>
  );
}

/**
 * A quest on its parchment pinned to the board (§7.4, docs/design/maquettes/AddonMissions.html): what counts, its
 * reward split, the first five with the member's line, their progress toward the podium.
 */
export function MissionCard({ view, member, linked = false }: { view: MissionView; member: Member; linked?: boolean }) {
  const { mission, scores, status } = view;
  const labels = MISSION_TYPE_LABELS[mission.type];
  const best = scores[0]?.score ?? 0;
  const progress = missionProgress(scores, member.id, labels.counts);
  return (
    <section
      className={`parchment quest-sheet relative flex flex-col gap-3 px-5 pt-[18px] pb-4 ${
        status === "closed" ? "saturate-75 brightness-90" : ""
      }`}
      aria-label={mission.title}
    >
      <span className="quest-pin" aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] font-extrabold tracking-[.16em] text-stamp-loot uppercase">
            {KICKERS[status]} · {labels.name.toLowerCase()}
          </p>
          <h2 className="font-pixel text-[26px] leading-tight font-bold text-parchment-ink">
            {linked ? (
              <Link href={`/quetes/${mission.id}`} className="hover:underline">
                {mission.title}
              </Link>
            ) : (
              mission.title
            )}
          </h2>
        </div>
        <Seal />
      </div>
      {status === "closed" && (
        <span className="quest-stamp" style={{ top: STAMP_TOP }}>
          ACCOMPLIE
        </span>
      )}
      <p className="text-[13px] leading-normal text-parchment-text">{missionPitch(mission.type)}</p>
      <div className="flex gap-2">
        {REWARD_SHARES.map((share, index) => (
          <div key={share} className="quest-prize">
            <span className="block text-[10px] font-extrabold text-parchment-muted">
              {formatPlace(index + 1)} · {share} %
            </span>
            <b className="font-pixel text-[17px] text-stamp-cash">
              {formatGold(Math.floor((mission.reward * share) / PERCENT))}
            </b>
          </div>
        ))}
      </div>
      <ol className="flex flex-col gap-[5px]" aria-label={`Classement · ${mission.title}`}>
        {scores.slice(0, SHOWN_SCORES).map((score, index) => {
          const mine = score.memberId === member.id;
          return (
            <li
              key={score.memberId}
              className={`grid min-h-[26px] grid-cols-[18px_minmax(0,1fr)_minmax(60px,110px)_40px] items-center gap-2.5 px-1.5 text-[13px] ${
                mine ? "bg-stamp-loot/14" : ""
              }`}
            >
              <b className="font-pixel text-parchment-muted">{index + 1}</b>
              <b className="truncate">
                {mine ? (
                  <span className="text-stamp-loot">Toi · {score.memberName}</span>
                ) : (
                  <MemberName name={score.memberName} characterClass={score.memberClass} onParchment />
                )}
              </b>
              <span className="h-1.5 bg-[rgba(90,60,30,.22)]">
                <span
                  className="block h-full bg-stamp-loot"
                  style={{ width: `${String(best === 0 ? 0 : Math.round((score.score / best) * PERCENT))}%` }}
                />
              </span>
              <b className="text-right font-pixel text-parchment-ink">{score.score}</b>
            </li>
          );
        })}
        {scores.length === 0 && <li className="text-[13px] text-parchment-text">Personne pour l&apos;instant.</li>}
      </ol>
      <div className="flex items-center gap-3 bg-stamp-loot/10 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(122,47,224,.4)]">
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-[10px] font-extrabold tracking-[.14em] text-stamp-loot uppercase">Ta progression</span>
          <span className="text-[13px] text-parchment-ink">{progress.text}</span>
        </div>
        <b className="font-pixel text-[22px] text-stamp-loot">
          {progress.place === undefined ? "—" : formatPlace(progress.place)}
        </b>
      </div>
      <div className="mt-auto flex justify-between gap-2.5 border-t border-dashed border-[rgba(90,60,30,.45)] pt-2 text-[11px] text-parchment-muted">
        <span>Égalité : le premier à atteindre le score</span>
        <span>Score relevé à chaque connexion</span>
      </div>
    </section>
  );
}
