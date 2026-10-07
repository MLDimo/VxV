"use server";

import { wallClockToInstant } from "@vxv/server/domain/dateTime";
import { formatGold } from "@vxv/server/domain/labels";
import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { formText, runCreateAction, runFormAction } from "@/server/formActions";
import { requireMember, requireOfficer } from "@/server/session";

/** The choices are typed one per line. */
const CHOICE_LINES = /\r?\n/;

export async function createBet(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  return runCreateAction(async () => {
    const application = getApplication();
    const betId = await application.bets.create(
      officer,
      {
        title: formText(form, "title"),
        choices: formText(form, "choices").split(CHOICE_LINES),
        closesAt: wallClockToInstant(formText(form, "closesAt")),
      },
      formText(form, "reason"),
    );
    await application.betAnnouncements.announceQuietly(betId);
    return `/paris/${betId}`;
  }, ["/", "/paris", "/journal"]);
}

/** The member stakes on a choice, moves their stake, or takes it back (intent "withdraw"). */
export async function stakeOnBet(_previous: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  const betId = formText(form, "betId");
  return runFormAction(async () => {
    const application = getApplication();
    if (form.get("intent") === "withdraw") {
      await application.bets.withdraw(member, betId);
      await application.betAnnouncements.announceQuietly(betId);
      return "Mise retirée.";
    }
    const amount = Number(form.get("amount"));
    await application.bets.stake(member, betId, formText(form, "choiceId"), amount);
    await application.betAnnouncements.announceQuietly(betId);
    return `Mise de ${formatGold(amount)} enregistrée : à payer au trésorier.`;
  }, ["/", "/paris", `/paris/${betId}`, "/paris/tresorerie"]);
}

/** An officer declares the winning choice, or cancels the bet (intent "cancel"), with a reason. */
export async function endBet(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  const betId = formText(form, "betId");
  const reason = formText(form, "reason");
  return runFormAction(async () => {
    const application = getApplication();
    if (form.get("intent") === "cancel") {
      await application.bets.cancel(officer, betId, reason);
      await application.betAnnouncements.announceQuietly(betId);
      return "Pari annulé : le trésorier rendra les mises payées.";
    }
    await application.bets.declareResult(officer, betId, formText(form, "choiceId"), reason);
    await application.betAnnouncements.announceQuietly(betId);
    return "Résultat déclaré.";
  }, ["/", "/paris", `/paris/${betId}`, "/paris/tresorerie", "/journal"]);
}
