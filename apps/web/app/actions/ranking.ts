"use server";

import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { formText, runFormAction } from "@/server/formActions";
import { requireOfficer } from "@/server/session";

export async function startSeason(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  return runFormAction(async () => {
    const season = await getApplication().ranking.startSeason(officer, formText(form, "reason"));
    return `Saison ${String(season.number)} lancée.`;
  }, ["/ranking", "/journal"]);
}

/** An officer gives a title the game does not measure (Princesse), for the week. */
export async function giveTitle(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  return runFormAction(async () => {
    await getApplication().titles.give(
      officer,
      formText(form, "titleId"),
      formText(form, "memberId"),
      formText(form, "reason"),
    );
    return "Titre donné pour la semaine.";
  }, ["/ranking/titres", "/journal"]);
}

/** An officer makes a title by hand and gives it to a member, until the reset or for an undetermined time. */
export async function giveCustomTitle(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  return runFormAction(async () => {
    await getApplication().titles.giveCustom(
      officer,
      {
        name: formText(form, "name"),
        memberId: formText(form, "memberId"),
        untilReset: formText(form, "duration") === "reset",
      },
      formText(form, "reason"),
    );
    return "Titre donné.";
  }, ["/ranking/titres", "/journal"]);
}

/** An officer takes back a title made by hand. */
export async function takeBackCustomTitle(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  return runFormAction(async () => {
    await getApplication().titles.takeBackCustom(officer, formText(form, "titleId"), formText(form, "reason"));
    return "Titre retiré.";
  }, ["/ranking/titres", "/journal"]);
}
