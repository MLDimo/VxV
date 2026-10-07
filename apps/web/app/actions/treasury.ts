"use server";

import { MANUAL_CASH_KINDS, type ManualCashKind } from "@vxv/server";
import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { formText, runFormAction } from "@/server/formActions";
import { requireMember } from "@/server/session";

const TREASURY_PAGES = ["/paris", "/paris/tresorerie", "/journal"];

/** The treasurer notes a stake (or a debt) received, or a gain handed over (intent "collected"). */
export async function validateStake(_previous: ActionState, form: FormData): Promise<ActionState> {
  const treasurer = await requireMember();
  const stakeId = formText(form, "stakeId");
  return runFormAction(async () => {
    const { treasury } = getApplication();
    if (form.get("intent") === "collected") {
      await treasury.markCollected(treasurer, stakeId);
      return "Gain noté versé.";
    }
    await treasury.markPaid(treasurer, stakeId);
    return "Mise notée payée.";
  }, TREASURY_PAGES);
}

const isManualKind = (kind: string): kind is ManualCashKind => (MANUAL_CASH_KINDS as readonly string[]).includes(kind);

/** The treasurer records a donation, an expense or a reward in the guild's cash. */
export async function recordCashMovement(_previous: ActionState, form: FormData): Promise<ActionState> {
  const treasurer = await requireMember();
  const kind = formText(form, "kind");
  const memberId = formText(form, "memberId");
  return runFormAction(async () => {
    await getApplication().cash.record(
      treasurer,
      {
        kind: isManualKind(kind) ? kind : ("" as ManualCashKind),
        amount: Number(form.get("amount")),
        label: formText(form, "label"),
        memberId: memberId === "" ? undefined : memberId,
      },
      formText(form, "reason"),
    );
    return "Mouvement inscrit dans la caisse.";
  }, ["/journal"]);
}
