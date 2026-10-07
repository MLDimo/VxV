"use server";

import type { ActionState } from "@/components/actionState";
import { describeRaidLogImport } from "@vxv/server/domain/journalDescriptions";
import { getApplication } from "@/server/application";
import { formText, runFormAction } from "@/server/formActions";
import { requireOfficer } from "@/server/session";

export async function importRaidLog(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  const eventId = formText(form, "eventId");
  return runFormAction(async () => {
    const summary = await getApplication().raidLogs.importLog(
      officer,
      eventId,
      formText(form, "log"),
      formText(form, "reason"),
    );
    return `Journal importé : ${describeRaidLogImport(summary)}.`;
  }, [`/evenements/${eventId}`, "/historique", "/journal"]);
}
