import { MISSION_TYPE_LABELS, REWARD_SHARES, type Member, type MissionView } from "@vxv/server";
import { formatEventDate, formatGold, formatPlace, formatRemaining } from "@vxv/server/domain/labels";
import Link from "next/link";
import { MemberName } from "./MemberName";

/** The first five of the ranking (§7.4). */
const SHOWN_SCORES = 5;

function statusText({ mission, status }: MissionView, now: Date): string {
  switch (status) {
    case "upcoming":
      return `Commence dans ${formatRemaining(mission.startsAt.getTime() - now.getTime())}`;
    case "running":
      return `Se termine dans ${formatRemaining(mission.endsAt.getTime() - now.getTime())}`;
    case "ended":
      return "Terminée : résultat à valider par un officier";
    case "closed":
      return "Résultat validé : le trésorier verse les récompenses";
  }
}

/** A mission on its parchment (§7.4): what counts, its reward split, the first five and the member's progress. */
export function MissionCard({
  view,
  member,
  now,
  linked = false,
}: {
  view: MissionView;
  member: Member;
  now: Date;
  linked?: boolean;
}) {
  const { mission, scores, status } = view;
  const labels = MISSION_TYPE_LABELS[mission.type];
  const best = scores[0]?.score ?? 0;
  const myIndex = scores.findIndex((score) => score.memberId === member.id);
  const mine = scores[myIndex];
  return (
    <section
      className={`parchment relative p-6 shadow-[0_0_0_2px_var(--color-ink),0_0_0_4px_var(--color-copper)] ${
        status === "closed" ? "saturate-75 brightness-90" : ""
      }`}
      aria-label={mission.title}
    >
      <p className="text-xs font-extrabold text-plum uppercase">Quête · {labels.name}</p>
      <h2 className="mt-1 font-pixel text-[26px] leading-tight">
        {linked ? (
          <Link href={`/quetes/${mission.id}`} className="hover:underline">
            {mission.title}
          </Link>
        ) : (
          mission.title
        )}
      </h2>
      {status === "closed" && (
        <span className="absolute top-6 right-6 rotate-[-12deg] border-2 border-ink-loss px-2 font-pixel text-ink-loss">
          ACCOMPLIE
        </span>
      )}
      <p className="mt-2">
        Le plus de {labels.counts} · du {formatEventDate(mission.startsAt)} au {formatEventDate(mission.endsAt)}
      </p>
      <p className="mt-1 text-sm font-bold">{statusText(view, now)}</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {REWARD_SHARES.map((share, index) => (
          <div key={share} className="border-2 border-ink-brown/40 px-3 py-2 text-center">
            <p className="text-xs font-extrabold uppercase">
              {formatPlace(index + 1)} · {share} %
            </p>
            <p className="font-pixel text-lg">{formatGold(Math.floor((mission.reward * share) / 100))}</p>
          </div>
        ))}
      </div>
      <ol className="mt-4 space-y-1" aria-label={`Classement · ${mission.title}`}>
        {scores.slice(0, SHOWN_SCORES).map((score, index) => (
          <li
            key={score.memberId}
            className={`grid grid-cols-[2rem_1fr_6rem] items-center gap-2 px-1 ${
              score.memberId === member.id ? "bg-plum/14" : ""
            }`}
          >
            <span className="font-pixel">{index + 1}</span>
            <span>
              <MemberName name={score.memberName} characterClass={score.memberClass} />
              <span
                className="mt-1 block h-1.5 bg-plum"
                style={{ width: `${String(best === 0 ? 0 : Math.round((score.score / best) * 100))}%` }}
              />
            </span>
            <span className="text-right font-pixel">{score.score}</span>
          </li>
        ))}
        {scores.length === 0 && <li>Personne pour l&apos;instant.</li>}
      </ol>
      <p className="mt-4 border-t border-dashed border-ink-brown/40 pt-3 text-sm">
        {mine === undefined
          ? "Ta progression : rien encore. L'addon VXV relève les compteurs du jeu, le compagnon les envoie au site."
          : `Ta progression : ${String(mine.score)} ${labels.counts}, ${formatPlace(myIndex + 1)}.`}
      </p>
    </section>
  );
}
