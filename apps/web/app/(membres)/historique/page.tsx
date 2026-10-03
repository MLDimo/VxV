import { softReserveRespected, type SoftReservedLoot } from "@vxv/server";
import { CharacterName } from "@/components/CharacterName";
import { formatDateTime, formatEventDate, raidTitle } from "@/components/format";
import { getApplication } from "@/server/application";

interface EventLoots {
  eventId: string;
  title: string;
  date: string;
  loots: SoftReservedLoot[];
}

function groupByEvent(loots: readonly SoftReservedLoot[]): EventLoots[] {
  const groups = new Map<string, EventLoots>();
  for (const loot of loots) {
    const group = groups.get(loot.eventId) ?? {
      eventId: loot.eventId,
      title: raidTitle(loot.raids),
      date: formatEventDate(loot.eventStartsAt),
      loots: [],
    };
    group.loots.push(loot);
    groups.set(loot.eventId, group);
  }
  return [...groups.values()];
}

export default async function HistoryPage() {
  const events = groupByEvent(await getApplication().history.listSoftReservedLoots());
  return (
    <>
      <h1 className="text-2xl font-bold">Historique des loots</h1>
      <p className="mt-2 text-zinc-400">Les objets réservés des raids précédents, et qui les a reçus.</p>
      {events.length === 0 ? (
        <p className="mt-8 text-zinc-500">Aucun loot enregistré pour l&apos;instant.</p>
      ) : (
        events.map((event) => (
          <section key={event.eventId} className="mt-8">
            <h2 className="text-lg font-semibold">{event.title}</h2>
            <p className="text-sm text-zinc-400">{event.date}</p>
            <ul className="mt-2 divide-y divide-zinc-800 rounded border border-zinc-800">
              {event.loots.map((loot) => {
                const respected = softReserveRespected(loot);
                return (
                  <li key={`${loot.itemName}-${loot.lootedAt.toISOString()}`} className="px-4 py-2">
                    <p className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold">{loot.itemName}</span>
                      <span className="text-sm text-zinc-400">{loot.bossName}</span>
                      <span className="text-sm">
                        reçu par <CharacterName name={loot.winnerName} characterClass={loot.winnerClass} />
                      </span>
                      <span className={`ml-auto text-xs ${respected ? "text-emerald-400" : "text-amber-400"}`}>
                        {respected ? "SR respectée" : "SR non respectée"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Réservé par {loot.softReservedBy.join(", ")} · {formatDateTime(loot.lootedAt)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
