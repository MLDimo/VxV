"use server";

import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { runFormAction } from "@/server/formActions";
import { requireOfficer } from "@/server/session";

export async function changeExclusion(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  const eventId = String(form.get("eventId") ?? "");
  const itemId = String(form.get("itemId") ?? "");
  const reason = String(form.get("reason") ?? "");
  return runFormAction(async () => {
    if (form.get("intent") === "include") {
      await getApplication().exclusions.include(officer, eventId, itemId, reason);
      return "Objet de nouveau réservable.";
    }
    await getApplication().exclusions.exclude(officer, eventId, itemId, reason);
    return "Objet exclu des SR.";
  }, [`/evenements/${eventId}`, "/journal"]);
}
