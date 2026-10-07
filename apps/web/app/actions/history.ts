"use server";

import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { formText, runFormAction } from "@/server/formActions";
import { requireOfficer } from "@/server/session";

export async function correctLoot(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  return runFormAction(async () => {
    await getApplication().history.correctLoot(
      officer,
      formText(form, "lootId"),
      { characterId: formText(form, "characterId"), method: formText(form, "method") },
      formText(form, "reason"),
    );
    return "Loot corrigé.";
  }, ["/historique", "/journal"]);
}
