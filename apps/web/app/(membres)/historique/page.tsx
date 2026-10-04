import { canManageRaids, fullName, SOFT_RESERVE_METHODS, softReserveRespected, type LootRecord } from "@vxv/server";
import Link from "next/link";
import { CharacterName } from "@/components/CharacterName";
import { LootCorrectionForm } from "@/components/LootCorrectionForm";
import { formatDateTime, formatEventDate, raidTitle } from "@/components/format";
import { LOOT_METHOD_LABELS } from "@vxv/server/domain/labels";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

const SOFT_RESERVE_FILTER = "sr";

interface EventLoots {
  eventId: string;
  title: string;
  date: string;
  loots: LootRecord[];
}

function groupByEvent(loots: readonly LootRecord[]): EventLoots[] {
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

function FilterLink({ href, current, children }: { href: string; current: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={current ? "font-semibold text-white" : "text-zinc-400 hover:text-white"}
    >
      {children}
    </Link>
  );
}

function SoftReserveOutcome({ loot }: { loot: LootRecord }) {
  if (!SOFT_RESERVE_METHODS.includes(loot.method)) {
    return null;
  }
  const respected = softReserveRespected(loot);
  return (
    <span className={`text-xs ${respected ? "text-emerald-400" : "text-amber-400"}`}>
      {respected ? "SR respectée" : "SR non respectée"}
    </span>
  );
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  const [{ filtre }, member] = await Promise.all([searchParams, requireMember()]);
  const softReserveOnly = filtre === SOFT_RESERVE_FILTER;
  const { history, characters } = getApplication();
  const isOfficer = canManageRaids(member.roles);
  const [loots, guild] = await Promise.all([
    history.listLoots({ softReserveOnly }),
    isOfficer ? characters.listInGuild() : [],
  ]);
  const events = groupByEvent(loots);
  return (
    <>
      <h1 className="text-2xl font-bold">Historique des loots</h1>
      <p className="mt-2 text-zinc-400">Les loots des raids précédents, comment ils ont été attribués et à qui.</p>
      <nav aria-label="Filtre de l'historique" className="mt-4 flex gap-4 text-sm">
        <FilterLink href="/historique" current={!softReserveOnly}>
          Tous les loots
        </FilterLink>
        <FilterLink href={`/historique?filtre=${SOFT_RESERVE_FILTER}`} current={softReserveOnly}>
          SR uniquement
        </FilterLink>
      </nav>
      {isOfficer && loots.length > 0 && (
        <section className="mt-6 rounded border border-amber-900/60 p-4">
          <h2 className="text-lg font-semibold">Officiers · corriger un loot</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Chaque correction est inscrite au journal, et un nouvel import du journal du raid la garde.
          </p>
          <LootCorrectionForm
            loots={loots.map((loot) => ({
              id: loot.id,
              label: `${loot.itemName} · ${loot.winnerName} (${LOOT_METHOD_LABELS[loot.method]}) · ${formatDateTime(loot.lootedAt)}`,
            }))}
            characters={guild.map((character) => ({ id: character.id, name: fullName(character) }))}
          />
        </section>
      )}
      {events.length === 0 ? (
        <p className="mt-8 text-zinc-500">Aucun loot enregistré pour l&apos;instant.</p>
      ) : (
        events.map((event) => (
          <section key={event.eventId} className="mt-8">
            <h2 className="text-lg font-semibold">{event.title}</h2>
            <p className="text-sm text-zinc-400">{event.date}</p>
            <ul className="mt-2 divide-y divide-zinc-800 rounded border border-zinc-800">
              {event.loots.map((loot) => (
                <li key={`${loot.itemName}-${loot.lootedAt.toISOString()}`} className="px-4 py-2">
                  <p className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold">{loot.itemName}</span>
                    <span className="text-sm text-zinc-400">{loot.bossName}</span>
                    <span className="text-sm">
                      reçu par <CharacterName name={loot.winnerName} characterClass={loot.winnerClass} />
                    </span>
                    <span className="ml-auto flex items-center gap-3">
                      <SoftReserveOutcome loot={loot} />
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs">{LOOT_METHOD_LABELS[loot.method]}</span>
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {loot.softReservedBy.length > 0 && `Réservé par ${loot.softReservedBy.join(", ")} · `}
                    {formatDateTime(loot.lootedAt)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
