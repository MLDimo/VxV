import type { HallOfFameEntry } from "@vxv/server";
import { formatGold } from "@vxv/server/domain/labels";
import { MemberName } from "./MemberName";
import { Panel } from "./Panel";

const POSITION = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** The hall of fame (§7.4, P12.7): missions won, gold won, mean place where the member scored. */
export function HallOfFame({ entries }: { entries: HallOfFameEntry[] }) {
  return (
    <Panel title="Hall of fame" officer>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-lavender">Aucune mission accomplie pour l&apos;instant.</p>
      ) : (
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs text-muted uppercase">
            <tr>
              <th className="py-1 pr-2">Joueur</th>
              <th className="py-1 pr-2">Gagnées</th>
              <th className="py-1 pr-2">Gains</th>
              <th className="py-1">Pos. moy.</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.memberId}>
                <th scope="row" className="py-1 pr-2 font-normal">
                  <MemberName name={entry.memberName} characterClass={entry.memberClass} />
                </th>
                <td className="py-1 pr-2">{entry.wins}</td>
                <td className="py-1 pr-2">{formatGold(entry.gains)}</td>
                <td className="py-1">{POSITION.format(entry.averagePosition)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-xs text-muted">Position moyenne sur les missions où le joueur a au moins un point.</p>
    </Panel>
  );
}
