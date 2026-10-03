"use server";

import type { ActionState } from "@/components/actionState";
import { describeRosterImport } from "@/components/journalEntries";
import { getApplication } from "@/server/application";
import { runFormAction } from "@/server/formActions";
import { requireOfficer } from "@/server/session";

export async function importRoster(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  return runFormAction(async () => {
    const summary = await getApplication().roster.importRoster(
      officer,
      String(form.get("roster") ?? ""),
      String(form.get("reason") ?? ""),
    );
    return `Liste importée : ${describeRosterImport(summary)}.`;
  }, ["/journal", "/personnages"]);
}
