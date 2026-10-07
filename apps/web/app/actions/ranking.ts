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
