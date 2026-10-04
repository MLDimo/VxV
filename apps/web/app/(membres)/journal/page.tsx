import { describeJournalEntry, JOURNAL_ACTION_LABELS } from "@vxv/server/domain/journalDescriptions";
import { formatDateTime } from "@/components/format";
import { getApplication } from "@/server/application";

export default async function JournalPage() {
  const entries = await getApplication().journal.listRecent();
  return (
    <>
      <h1 className="text-2xl font-bold">Journal des modifications</h1>
      <p className="mt-2 text-zinc-400">
        Toutes les actions des officiers, avec leur motif. Rien ne peut en être effacé.
      </p>
      {entries.length === 0 ? (
        <p className="mt-8 text-zinc-500">Aucune action pour l&apos;instant.</p>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-800">
          {entries.map((entry) => (
            <li key={entry.id} className="py-4">
              <p className="text-sm text-zinc-400">
                {formatDateTime(entry.occurredAt)} · {entry.actorName}
              </p>
              <p className="mt-1 font-semibold">{JOURNAL_ACTION_LABELS[entry.action]}</p>
              <p className="text-zinc-300">{describeJournalEntry(entry)}</p>
              <p className="mt-1 text-sm text-zinc-400">Motif : {entry.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
