import { formatDateTime } from "@vxv/server/domain/labels";
import { canManageTreasury, type JournalAction } from "@vxv/server";
import { describeJournalEntry, JOURNAL_ACTION_LABELS } from "@vxv/server/domain/journalDescriptions";
import { CashPage } from "@/components/CashPage";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { guildMembers } from "@/server/guildMembers";
import { requireMember } from "@/server/session";

/** The stamp of each officer action (§7.7): its category, in its ink. */
const STAMPS: Record<JournalAction, { label: string; className: string }> = {
  "roster.import": { label: "GUILDE", className: "border-ink-brown text-ink-brown" },
  "event.create": { label: "RAID", className: "border-stamp-raid text-stamp-raid" },
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
};

/** The accounts book (§7.7): the guild's cash on the left, the officers' journal on the right. */
export default async function JournalPage() {
  const member = await requireMember();
  const { journal, cash } = getApplication();
  const [entries, overview, givers] = await Promise.all([journal.listRecent(), cash.overview(), guildMembers()]);
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
          </section>
        </div>
      </div>
    </>
  );
}
