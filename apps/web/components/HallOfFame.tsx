import type { HallOfFameEntry } from "@vxv/server";
import { formatGold } from "@vxv/server/domain/labels";
import { MemberName } from "./MemberName";
import { Panel } from "./Panel";

const POSITION = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** The hall of fame (§7.4, P12.7), in its gold frame: quests won, gold won, mean place where the member scored. */
export function HallOfFame({ entries, className = "" }: { entries: HallOfFameEntry[]; className?: string }) {
  return (
    <Panel title="Hall of fame" officer className={`flex flex-col gap-2.5 ${className}`}>
      {entries.length === 0 ? (
        <p className="text-sm text-lavender">Aucune quête accomplie pour l&apos;instant.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry, index) => (
            <li key={entry.memberId} className="flex flex-col gap-px border-b border-dashed border-gold/25 pb-1.5">
              <div className="flex items-baseline gap-1.5">
                <b className="font-pixel text-muted">{index + 1}</b>
                <b className="text-sm">
                  <MemberName name={entry.memberName} characterClass={entry.memberClass} />
                </b>
                <b className="ml-auto font-pixel text-gold" title="Quêtes gagnées">
                  {entry.wins} ★
                </b>
              </div>
              <span className="text-[11px] text-old-paper">
                {formatGold(entry.gains)} · pos. moy. {POSITION.format(entry.averagePosition)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
