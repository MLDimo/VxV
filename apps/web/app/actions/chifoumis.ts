"use server";

import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { formText, runFormAction } from "@/server/formActions";
import { requireMember } from "@/server/session";

/** The winner confirms the loser paid the Chi Fou Mi's stake. */
export async function confirmChifoumiPayment(_previous: ActionState, form: FormData): Promise<ActionState> {
  const winner = await requireMember();
  const chifoumiId = formText(form, "chifoumiId");
  return runFormAction(async () => {
    await getApplication().chifoumis.confirmPayment(winner, chifoumiId);
    return "Paiement confirmé : la dette est réglée.";
  }, ["/paris", "/paris/chifoumi", "/paris/tresorerie"]);
}
