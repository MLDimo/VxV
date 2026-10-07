"use server";

import type { ActionState } from "@/components/actionState";
import { describeRosterImport } from "@vxv/server/domain/journalDescriptions";
import { getApplication } from "@/server/application";
import { formText, runFormAction } from "@/server/formActions";
import { requireOfficer } from "@/server/session";

export async function importRoster(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  return runFormAction(async () => {
    const summary = await getApplication().roster.importRoster(
      officer,
      formText(form, "roster"),
      formText(form, "reason"),
    );
    return `Liste importée : ${describeRosterImport(summary)}.`;
  }, ["/journal", "/personnages"]);
}
