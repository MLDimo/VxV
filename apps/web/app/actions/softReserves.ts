"use server";

import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { runFormAction } from "@/server/formActions";
import { requireMember } from "@/server/session";

export async function setMySoftReserves(_previous: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  const eventId = String(form.get("eventId") ?? "");
  return runFormAction(async () => {
    await getApplication().softReserves.setMine(member, eventId, form.getAll("itemIds").map(String));
    return "SR enregistrées.";
  }, [`/evenements/${eventId}`]);
}
