"use server";

import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { runFormAction } from "@/server/formActions";
import { requireMember, requireOfficer } from "@/server/session";

const itemIdsOf = (form: FormData) => form.getAll("itemIds").map(String);

export async function setMySoftReserves(_previous: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  const eventId = String(form.get("eventId") ?? "");
  return runFormAction(async () => {
    await getApplication().softReserves.setMine(member, eventId, itemIdsOf(form));
    return "SR enregistrées.";
  }, [`/evenements/${eventId}`]);
}

export async function overrideSoftReserves(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  const eventId = String(form.get("eventId") ?? "");
  return runFormAction(async () => {
    await getApplication().softReserves.override(
      officer,
      eventId,
      String(form.get("characterId") ?? ""),
      itemIdsOf(form),
      String(form.get("reason") ?? ""),
    );
    return "SR du joueur corrigées.";
  }, [`/evenements/${eventId}`, "/journal"]);
}
