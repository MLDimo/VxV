"use server";

import { wallClockToInstant } from "@vxv/server/domain/dateTime";
import { formatGold } from "@vxv/server/domain/labels";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { runFormAction } from "@/server/formActions";
import { requireMember, requireOfficer } from "@/server/session";

/** The choices are typed one per line. */
const CHOICE_LINES = /\r?\n/;

export async function createBet(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  let betId: string | undefined;
  const state = await runFormAction(async () => {
    const application = getApplication();
    betId = await application.bets.create(
      officer,
      {
        title: String(form.get("title") ?? ""),
        choices: String(form.get("choices") ?? "").split(CHOICE_LINES),
        closesAt: wallClockToInstant(String(form.get("closesAt") ?? "")),
      },
      String(form.get("reason") ?? ""),
    );
    await application.betAnnouncements.announceQuietly(betId);
    return "Pari ouvert.";
  }, ["/", "/paris", "/journal"]);
  if (betId !== undefined) {
    redirect(`/paris/${betId}`);
  }
  return state;
}

/** The member stakes on a choice, moves their stake, or takes it back (intent "withdraw"). */
export async function stakeOnBet(_previous: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  const betId = String(form.get("betId") ?? "");
  return runFormAction(async () => {
    const application = getApplication();
    if (form.get("intent") === "withdraw") {
      await application.bets.withdraw(member, betId);
      await application.betAnnouncements.announceQuietly(betId);
      return "Mise retirée.";
    }
    const amount = Number(form.get("amount"));
    await application.bets.stake(member, betId, String(form.get("choiceId") ?? ""), amount);
    await application.betAnnouncements.announceQuietly(betId);
    return `Mise de ${formatGold(amount)} enregistrée : à payer au trésorier.`;
  }, ["/", "/paris", `/paris/${betId}`]);
}
