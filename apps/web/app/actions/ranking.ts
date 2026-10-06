"use server";

import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { runFormAction } from "@/server/formActions";
import { requireOfficer } from "@/server/session";

export async function startSeason(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  return runFormAction(async () => {
    const season = await getApplication().ranking.startSeason(officer, String(form.get("reason") ?? ""));
    return `Saison ${String(season.number)} lancée.`;
  }, ["/ranking", "/journal"]);
}
