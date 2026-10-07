"use server";

import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { formText, runFormAction } from "@/server/formActions";
import { requireMember } from "@/server/session";

/** The winner confirms the loser paid the deathroll's stake (P15.6). */
export async function confirmDeathrollPayment(_previous: ActionState, form: FormData): Promise<ActionState> {
  const winner = await requireMember();
  const deathrollId = formText(form, "deathrollId");
  return runFormAction(async () => {
    await getApplication().deathrolls.confirmPayment(winner, deathrollId);
    return "Paiement confirmé : la dette est réglée.";
  }, ["/paris", "/paris/deathroll", "/paris/tresorerie"]);
}
