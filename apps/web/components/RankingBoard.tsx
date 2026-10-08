import type { RankingLine, RankingView } from "@vxv/server";
import { formatSigned, formatSignedGold } from "@vxv/server/domain/labels";
import { Avatar } from "./Avatar";
import { classColor } from "./characterClasses";
import { MemberName } from "./MemberName";
import { Panel } from "./Panel";

/** The podium's steps (§7.5), by place: their metal, and their banner's height. */
const METALS = [
  { name: "Or", color: "var(--color-gold)", height: 330 },
  { name: "Argent", color: "var(--color-silver)", height: 300 },
  { name: "Bronze", color: "var(--color-bronze)", height: 280 },
] as const;
/** Second, first, third, as on a podium; and the banners sway out of step. */
const ORDER = [1, 0, 2] as const;
const SWAY_DELAYS = ["-1.2s", "0s", "-2.4s"] as const;
const PODIUM_PLACES = 3;
const PERCENT = 100;

/** What a board shows (a Ranking's category, the duels' Elo): its places, the first three on the podium, its records,
 * and how its values read. */
export type Board = Pick<RankingView, "unit" | "lines" | "records">;

/** A value as the board writes it: gold with its sign (and po on the banners), points with their sign, or a count. */
function valueText(board: Board, value: number, withGold: boolean): string {
  if (board.unit === "count") {
    return String(value);
  }
  return board.unit === "gold" && withGold ? formatSignedGold(value) : formatSigned(value);
}

const cloth = (line: RankingLine) =>
  line.characterClass === undefined ? "var(--color-muted)" : classColor(line.characterClass);

function Banner({ board, line, place }: { board: Board; line: RankingLine; place: 0 | 1 | 2 }) {
  const metal = METALS[place];
  return (
    <li className="relative mt-[10px] w-[150px]">
      <span className="absolute -top-[6px] left-[26px] z-10 h-[14px] w-[10px] bg-copper shadow-[0_0_0_2px_var(--color-ink)]" />
      <span className="absolute -top-[6px] right-[26px] z-10 h-[14px] w-[10px] bg-copper shadow-[0_0_0_2px_var(--color-ink)]" />
      <div
        className="fanion relative flex flex-col items-center gap-2 px-[10px] pt-3 text-center text-banner-ink"
        style={{
          height: metal.height,
          animationDelay: SWAY_DELAYS[ORDER.indexOf(place)],
          background: `linear-gradient(90deg, rgba(0,0,0,.18), rgba(255,255,255,.08) 40%, rgba(0,0,0,.15)), ${cloth(line)}`,
        }}
      >
        <span className="absolute inset-y-0 left-2 w-1" style={{ background: metal.color }} />
        <span className="absolute inset-y-0 right-2 w-1" style={{ background: metal.color }} />
        <span className="text-[10px] font-extrabold tracking-[.2em] uppercase">{metal.name}</span>
        <span
          className="flex size-[46px] items-center justify-center font-pixel text-[26px]"
          style={{
            background: metal.color,
            boxShadow:
              "0 0 0 2px var(--color-ink), inset -4px -4px 0 rgba(0,0,0,.25), inset 4px 4px 0 rgba(255,255,255,.4)",
          }}
        >
          {line.rank}
        </span>
        <span className="mt-1.5" style={{ boxShadow: `0 0 0 3px var(--color-ink), 0 0 0 5px ${metal.color}` }}>
          <Avatar characterClass={line.characterClass} race={line.race} sex={line.sex} size={72} />
        </span>
        <b className="font-pixel text-[21px] leading-tight">{line.name.split(" ")[0]}</b>
        <span className="min-h-[14px] text-[11px] font-extrabold text-banner-title">
          {line.title === undefined ? "" : `◆ ${line.title}`}
        </span>
        <b className="bg-banner-ink px-2 py-0.5 font-pixel text-[19px] text-ivory">
          {valueText(board, line.value, true)}
        </b>
      </div>
    </li>
  );
}

/** The first three on banners hanging from a wooden rod (§7.5). */
function Podium({ board }: { board: Board }) {
  return (
    <div className="relative pt-1.5">
      <div className="absolute inset-x-1.5 top-0 h-[10px] bg-beam shadow-[0_0_0_2px_var(--color-ink),inset_0_3px_0_var(--color-copper)]" />
      <span className="absolute -top-1 left-0 h-[18px] w-[14px] bg-gold shadow-[0_0_0_2px_var(--color-ink)]" />
      <span className="absolute -top-1 right-0 h-[18px] w-[14px] bg-gold shadow-[0_0_0_2px_var(--color-ink)]" />
      <ol className="flex items-start justify-center gap-[18px]" aria-label="Podium">
        {ORDER.flatMap((place) => {
          const line = board.lines[place];
          return line === undefined ? [] : [<Banner key={line.memberId} board={board} line={line} place={place} />];
        })}
      </ol>
    </div>
  );
}

function Records({ board, title }: { board: Board; title: string }) {
  return (
    <Panel title={title} className="mt-auto">
      {board.records.length === 0 ? (
        <p className="mt-2 text-sm text-lavender">Aucun record pour l&apos;instant.</p>
      ) : (
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {board.records.map((record) => (
            <li
              key={record.label}
              className="flex flex-col gap-0.5 bg-night/55 px-2.5 py-2 shadow-[inset_0_0_0_1px_var(--color-line)]"
            >
              <span className="text-[10px] font-extrabold tracking-widest text-muted uppercase">{record.label}</span>
              <b className="font-pixel text-[17px] text-gold">{record.value}</b>
              <span className="text-xs font-bold">
                <MemberName name={record.member.name} characterClass={record.member.characterClass} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Row({ board, line, widest, mine }: { board: Board; line: RankingLine; widest: number; mine: boolean }) {
  const positive = line.value >= 0;
  return (
    <li
      className={`grid min-h-[42px] grid-cols-[24px_32px_minmax(0,1fr)_80px_64px] items-center gap-2.5 px-2 ${
        mine
          ? "bg-amethyst/16 shadow-[inset_0_0_0_2px_var(--color-amethyst)]"
          : "shadow-[inset_0_0_0_1px_var(--color-line)] odd:bg-amethyst/6 even:bg-night/40"
      }`}
    >
      <b className={`font-pixel ${mine ? "text-amethyst-light" : "text-muted"}`}>{line.rank}</b>
      <Avatar characterClass={line.characterClass} race={line.race} sex={line.sex} size={32} />
      <span className="flex min-w-0 flex-col">
        <b className="truncate text-sm">
          {mine && "Toi · "}
          <MemberName name={line.name} characterClass={line.characterClass} />
        </b>
        <span className={`text-[11px] ${mine ? "text-muted" : "text-sakura-light"}`}>
          {mine ? "ta position" : line.title === undefined ? "" : `◆ ${line.title}`}
        </span>
      </span>
      <span className="h-1.5 overflow-hidden bg-line">
        <span
          className={`block h-full ${positive ? "bg-gain" : "bg-loss"}`}
          style={{ width: `${String(widest === 0 ? 0 : Math.round((Math.abs(line.value) / widest) * PERCENT))}%` }}
        />
      </span>
      <b className={`text-right font-pixel text-[15px] ${positive ? "text-gain" : "text-loss"}`}>
        {valueText(board, line.value, false)}
      </b>
    </li>
  );
}

/** A board (§7.5): the podium and the records, then the others and the member's own position. */
export function RankingBoard({
  board,
  memberId,
  recordsTitle,
  note,
  empty,
}: {
  board: Board;
  memberId: string;
  recordsTitle: string;
  /** What the values are, on the right of the following places: "gain net · Saison 2". */
  note: string;
  /** Why nobody is on the board. */
  empty: string;
}) {
  const widest = Math.max(0, ...board.lines.map((line) => Math.abs(line.value)));
  const mine = board.lines.find((line) => line.memberId === memberId);
  const rest = board.lines.slice(PODIUM_PLACES);
  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col gap-4">
        {board.lines.length === 0 ? <p className="text-lavender">{empty}</p> : <Podium board={board} />}
        <Records board={board} title={recordsTitle} />
      </div>
      <Panel title="Suite du classement" note={note}>
        <ol className="mt-2 flex flex-col gap-1.5" aria-label="Classement">
          {rest.map((line) => (
            <Row key={line.memberId} board={board} line={line} widest={widest} mine={false} />
          ))}
        </ol>
        {mine !== undefined && (
          <ol className="mt-4" aria-label="Ta position">
            <Row board={board} line={mine} widest={widest} mine />
          </ol>
        )}
      </Panel>
    </div>
  );
}
