import type { JournalAction } from "@vxv/server";
import { describeJournalEntry, JOURNAL_ACTION_LABELS } from "@vxv/server/domain/journalDescriptions";
import { formatDateTime } from "@/components/format";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";

/** The stamp of each officer action (§7.7): its category, in its ink. */
const STAMPS: Record<JournalAction, { label: string; className: string }> = {
  "roster.import": { label: "GUILDE", className: "border-ink-brown text-ink-brown" },
  "event.create": { label: "RAID", className: "border-[#3a5aa0] text-[#3a5aa0]" },
  "exclusion.add": { label: "RAID", className: "border-[#3a5aa0] text-[#3a5aa0]" },
  "exclusion.remove": { label: "RAID", className: "border-[#3a5aa0] text-[#3a5aa0]" },
  "softReserve.override": { label: "RAID", className: "border-[#3a5aa0] text-[#3a5aa0]" },
  "raid.import": { label: "RAID", className: "border-[#3a5aa0] text-[#3a5aa0]" },
  "loot.council": { label: "LOOT", className: "border-[#7a2fe0] text-[#7a2fe0]" },
  "loot.correct": { label: "LOOT", className: "border-[#7a2fe0] text-[#7a2fe0]" },
};

/** The accounts book (§7.7): the guild's cash on the left (to come), the officers' journal on the right. */
export default async function JournalPage() {
  const entries = await getApplication().journal.listRecent();
  return (
    <>
      <ScreenHeader title="Journal" />
      <div className="leather mt-8 p-4">
        <div className="grid gap-1 lg:grid-cols-[1fr_1.4fr]">
          <section className="ruled-page p-6 shadow-[inset_-24px_0_30px_-18px_rgba(70,40,10,0.55)]">
            <h2 className="font-pixel text-xl">La caisse</h2>
            <p className="mt-4 text-sm">Bientôt : dons, dettes et caisse de la guilde, avec les paris.</p>
          </section>
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
