import type { JournalEntry } from "../domain/journal.ts";
import type { UnitOfWork } from "./ports.ts";

const JOURNAL_PAGE_SIZE = 100;

export function createJournal({ unitOfWork }: { unitOfWork: UnitOfWork }) {
  return {
    /** The journal is readable by every guild member: transparency of officer actions. */
    listRecent(): Promise<JournalEntry[]> {
      return unitOfWork.run(({ journal }) => journal.listRecent(JOURNAL_PAGE_SIZE));
    },
  };
}
