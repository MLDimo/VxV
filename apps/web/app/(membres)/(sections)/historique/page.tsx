import {
  canManageRaids,
  fullName,
  SOFT_RESERVE_METHODS,
  softReserveRespected,
  type LootMethod,
  type LootRecord,
} from "@vxv/server";
import Link from "next/link";
import { CharacterName } from "@/components/CharacterName";
import { LootCorrectionForm } from "@/components/LootCorrectionForm";
import { RaidNav } from "@/components/RaidNav";
import { ScreenHeader } from "@/components/ScreenHeader";
import { formatDateTime, formatEventDate, raidTitle } from "@/components/format";
import { LOOT_METHOD_LABELS } from "@vxv/server/domain/labels";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

const SOFT_RESERVE_FILTER = "sr";
/** Tags of the loot methods (§7.1): SR violet, SR+ solid gold, free roll green, loot council sakura. */
const METHOD_TAGS: Record<LootMethod, string> = {
  soft_reserve: "bg-amethyst/20 text-epic",
  soft_reserve_plus: "bg-gold text-ink",
  free_roll: "bg-gain/14 text-gain",
  loot_council: "bg-sakura/14 text-sakura",
};

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
    <Link href={href} aria-current={current ? "page" : undefined} className="tab">
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
    <span className={`text-xs ${respected ? "text-gain" : "text-gold"}`}>
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
      <ScreenHeader kicker="Conseil de guerre" title="Historique des loots" />
      <RaidNav current="/historique" />
      <p className="mt-6 text-muted">Les loots des raids précédents, comment ils ont été attribués et à qui.</p>
      <nav aria-label="Filtre de l'historique" className="mt-4 flex gap-3">
        <FilterLink href="/historique" current={!softReserveOnly}>
          Tous les loots
        </FilterLink>
        <FilterLink href={`/historique?filtre=${SOFT_RESERVE_FILTER}`} current={softReserveOnly}>
          SR uniquement
        </FilterLink>
      </nav>
      {isOfficer && loots.length > 0 && (
        <section className="panel-officer mt-8">
          <h2 className="font-pixel text-lg text-ivory">Officiers · corriger un loot</h2>
          <p className="mt-1 text-sm text-muted">
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
        <p className="mt-8 text-muted">Aucun loot enregistré pour l&apos;instant.</p>
      ) : (
        events.map((event) => (
          <section key={event.eventId} className="mt-8">
            <h2 className="font-pixel text-lg text-ivory">{event.title}</h2>
            <p className="text-sm text-muted">{event.date}</p>
            <ul className="mt-4 divide-y divide-line bg-panel ring-pixel">
              {event.loots.map((loot) => (
                <li key={`${loot.itemName}-${loot.lootedAt.toISOString()}`} className="px-4 py-2">
                  <p className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-epic">{loot.itemName}</span>
                    <span className="text-sm text-muted">{loot.bossName}</span>
                    <span className="text-sm">
                      reçu par <CharacterName name={loot.winnerName} characterClass={loot.winnerClass} />
                    </span>
                    <span className="ml-auto flex items-center gap-3">
                      <SoftReserveOutcome loot={loot} />
                      <span className={`px-2 py-0.5 text-xs font-extrabold ${METHOD_TAGS[loot.method]}`}>
                        {LOOT_METHOD_LABELS[loot.method]}
                      </span>
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted">
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
