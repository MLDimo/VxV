import { formatDateTime, formatGold } from "@vxv/server/domain/labels";
import { canManageTreasury, type JournalAction } from "@vxv/server";
import { describeJournalEntry, JOURNAL_ACTION_LABELS } from "@vxv/server/domain/journalDescriptions";
import { CashPage } from "@/components/CashPage";
import { CharacterName } from "@/components/CharacterName";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { guildMembers } from "@/server/guildMembers";
import { requireMember } from "@/server/session";

/** The stamp of each officer action (§7.7): its category, in its ink. */
const STAMPS: Record<JournalAction, { label: string; className: string }> = {
  "roster.import": { label: "GUILDE", className: "border-ink-brown text-ink-brown" },
  "event.create": { label: "RAID", className: "border-stamp-raid text-stamp-raid" },
  "event.delete": { label: "RAID", className: "border-stamp-raid text-stamp-raid" },
  "exclusion.add": { label: "RAID", className: "border-stamp-raid text-stamp-raid" },
  "exclusion.remove": { label: "RAID", className: "border-stamp-raid text-stamp-raid" },
  "softReserve.override": { label: "RAID", className: "border-stamp-raid text-stamp-raid" },
  "raid.import": { label: "RAID", className: "border-stamp-raid text-stamp-raid" },
  "loot.council": { label: "LOOT", className: "border-stamp-loot text-stamp-loot" },
  "loot.correct": { label: "LOOT", className: "border-stamp-loot text-stamp-loot" },
  "bet.create": { label: "PARI", className: "border-stamp-bet text-stamp-bet" },
  "bet.result": { label: "PARI", className: "border-stamp-bet text-stamp-bet" },
  "bet.cancel": { label: "PARI", className: "border-stamp-bet text-stamp-bet" },
  "season.start": { label: "GUILDE", className: "border-ink-brown text-ink-brown" },
  "mission.create": { label: "QUÊTE", className: "border-stamp-quest text-stamp-quest" },
  "mission.close": { label: "QUÊTE", className: "border-stamp-quest text-stamp-quest" },
  "title.give": { label: "TITRE", className: "border-ink-brown text-ink-brown" },
  "title.custom": { label: "TITRE", className: "border-ink-brown text-ink-brown" },
  "title.takeBack": { label: "TITRE", className: "border-ink-brown text-ink-brown" },
  "duel.result": { label: "PVP", className: "border-stamp-bet text-stamp-bet" },
  "duel.cancel": { label: "PVP", className: "border-stamp-bet text-stamp-bet" },
  "legend.chapter": { label: "LÉGENDE", className: "border-stamp-cash text-stamp-cash" },
  "legend.publish": { label: "LÉGENDE", className: "border-stamp-cash text-stamp-cash" },
  "legend.refuse": { label: "LÉGENDE", className: "border-stamp-cash text-stamp-cash" },
};

/** How many of Le Dé Pipé's latest games the journal shows. */
const GAMES_SHOWN = 10;

/**
 * The accounts book (§7.7): the guild's cash on the left; on the right the officers' journal, then Le Dé Pipé's latest
 * games (owner's request of 9 November).
 */
export default async function JournalPage() {
  const member = await requireMember();
  const { journal, cash, deathrolls, chifoumis } = getApplication();
  const [entries, overview, givers, rolled, played] = await Promise.all([
    journal.listRecent(),
    cash.overview(),
    guildMembers(),
    deathrolls.list(),
    chifoumis.list(),
  ]);
  const games = [
    ...rolled.map((view) => ({ ...view, kind: "Deathroll" })),
    ...played.map((view) => ({ ...view, kind: "Chi Fou Mi" })),
  ]
    .sort((left, right) => right.game.endedAt.getTime() - left.game.endedAt.getTime())
    .slice(0, GAMES_SHOWN);
  return (
    <>
      <ScreenHeader title="Journal" />
      <div className="leather mt-8 p-4">
        <div className="grid gap-1 lg:grid-cols-[1fr_1.4fr]">
          <CashPage overview={overview} treasurer={canManageTreasury(member.roles)} givers={givers} />
          <section className="ruled-page p-6 shadow-[inset_24px_0_30px_-18px_rgba(70,40,10,0.55)]">
            <h2 className="font-pixel text-xl">Journal des officiers</h2>
            <p className="mt-1 text-sm">
              Toutes les actions des officiers, avec leur motif. Rien ne peut en être effacé.
            </p>
            {entries.length === 0 ? (
              <p className="mt-6">Aucune action pour l&apos;instant.</p>
            ) : (
              <ul className="mt-6 space-y-5">
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span
                        className={`border-[1.5px] px-1 text-[11px] font-extrabold ${STAMPS[entry.action].className}`}
                      >
                        {STAMPS[entry.action].label}
                      </span>
                      {formatDateTime(entry.occurredAt)} · {entry.actorName}
                    </p>
                    <p className="mt-1 font-bold">{JOURNAL_ACTION_LABELS[entry.action]}</p>
                    <p>{describeJournalEntry(entry)}</p>
                    <p className="mt-1 text-sm italic">Motif : {entry.reason}</p>
                  </li>
                ))}
              </ul>
            )}
            <h2 className="mt-10 font-pixel text-xl">Le Dé Pipé</h2>
            <p className="mt-1 text-sm">Les dernières parties de deathroll et de Chi Fou Mi, jouées en jeu.</p>
            {games.length === 0 ? (
              <p className="mt-6">Aucune partie pour l&apos;instant.</p>
            ) : (
              <ul className="mt-6 space-y-3" aria-label="Dernières parties du Dé Pipé">
                {games.map((view) => (
                  <li key={`${view.kind}-${view.game.id}`}>
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="border-[1.5px] border-stamp-bet px-1 text-[11px] font-extrabold text-stamp-bet">
                        {view.kind.toUpperCase()}
                      </span>
                      {formatDateTime(view.game.endedAt)}
                    </p>
                    <p className="mt-1">
                      <CharacterName name={view.winner.name} characterClass={view.winner.characterClass} onParchment />{" "}
                      bat{" "}
                      <CharacterName name={view.loser.name} characterClass={view.loser.characterClass} onParchment /> ·{" "}
                      {formatGold(view.game.stake)}
                      {view.game.stake > 0 && view.game.paidAt === undefined && " · à payer"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
