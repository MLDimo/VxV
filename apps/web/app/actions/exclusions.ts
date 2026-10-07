"use server";

import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { formText, runFormAction } from "@/server/formActions";
import { requireOfficer } from "@/server/session";

export async function changeExclusion(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  const eventId = formText(form, "eventId");
  const itemId = formText(form, "itemId");
  const reason = formText(form, "reason");
  return runFormAction(async () => {
    if (form.get("intent") === "include") {
      await getApplication().exclusions.include(officer, eventId, itemId, reason);
      return "Objet de nouveau réservable.";
    }
    await getApplication().exclusions.exclude(officer, eventId, itemId, reason);
    return "Objet exclu des SR.";
  }, [`/evenements/${eventId}`, "/journal"]);
}
