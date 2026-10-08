"use server";

import type { ActionState } from "@/components/actionState";
import { wallClockToInstant } from "@vxv/server/domain/dateTime";
import { getApplication } from "@/server/application";
import { formText, runFormAction } from "@/server/formActions";
import { requireMember, requireOfficer } from "@/server/session";

/** The pages a duel shows on: its list, the ranking, and its bet among the others. */
const DUEL_PAGES = ["/pvp/duels", "/pvp/classement", "/paris"];

/** The member challenges another to a duel. */
export async function challengeDuel(_previous: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  return runFormAction(async () => {
    await getApplication().duels.challenge(member, {
      opponentId: formText(form, "opponentId"),
      scheduledAt: wallClockToInstant(formText(form, "scheduledAt")),
      place: formText(form, "place"),
    });
    return "Défi lancé : le joueur défié est prévenu sur Discord.";
  }, DUEL_PAGES);
}

/** What a duelist does with their duel: take up or turn down the challenge, call it off, or concede it. */
export async function actOnDuel(_previous: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  const duelId = formText(form, "duelId");
  return runFormAction(async () => {
    const { duels } = getApplication();
    switch (formText(form, "intent")) {
      case "accept":
        await duels.answer(member, duelId, true);
        return "Défi relevé : la guilde peut parier sur le duel.";
      case "refuse":
        await duels.answer(member, duelId, false);
        return "Défi refusé.";
      case "cancel":
        await duels.cancel(member, duelId);
        return "Duel annulé : les mises sont rendues.";
      default:
        await duels.concede(member, duelId);
        return "Défaite enregistrée : le pari est réglé.";
    }
  }, DUEL_PAGES);
}

/** An officer records a duel's winner, or calls it off, with a reason. */
export async function settleDuel(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  const duelId = formText(form, "duelId");
  const reason = formText(form, "reason");
  return runFormAction(async () => {
    const { duels } = getApplication();
    if (formText(form, "intent") === "cancel") {
      await duels.cancelAsOfficer(officer, duelId, reason);
      return "Duel annulé : les mises sont rendues.";
    }
    await duels.recordAsOfficer(officer, duelId, formText(form, "winnerId"), reason);
    return "Vainqueur enregistré : le pari est réglé.";
  }, [...DUEL_PAGES, "/journal"]);
}
