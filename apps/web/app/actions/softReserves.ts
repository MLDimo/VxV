"use server";

import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { formText, runFormAction } from "@/server/formActions";
import { requireMember, requireOfficer } from "@/server/session";

const itemIdsOf = (form: FormData) => form.getAll("itemIds").map(String);

export async function setMySoftReserves(_previous: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  const eventId = formText(form, "eventId");
  return runFormAction(async () => {
    await getApplication().softReserves.setMine(member, eventId, itemIdsOf(form));
    return "SR enregistrées.";
  }, [`/evenements/${eventId}`]);
}

export async function overrideSoftReserves(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  const eventId = formText(form, "eventId");
  return runFormAction(async () => {
    await getApplication().softReserves.override(
      officer,
      eventId,
      formText(form, "characterId"),
      itemIdsOf(form),
      formText(form, "reason"),
    );
    return "SR du joueur corrigées.";
  }, [`/evenements/${eventId}`, "/journal"]);
}
