"use server";

import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { runFormAction } from "@/server/formActions";
import { requireMember } from "@/server/session";

export async function signUp(_previous: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  const eventId = String(form.get("eventId") ?? "");
  return runFormAction(async () => {
    await getApplication().signups.signUp(member, eventId, {
      characterId: String(form.get("characterId") ?? ""),
      role: String(form.get("role") ?? ""),
      spec: String(form.get("spec") ?? ""),
      status: String(form.get("status") ?? ""),
    });
    return "Inscription enregistrée.";
  }, [`/evenements/${eventId}`]);
}
