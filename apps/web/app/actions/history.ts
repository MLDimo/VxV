"use server";

import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { runFormAction } from "@/server/formActions";
import { requireOfficer } from "@/server/session";

export async function correctLoot(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  return runFormAction(async () => {
    await getApplication().history.correctLoot(
      officer,
      String(form.get("lootId") ?? ""),
      { characterId: String(form.get("characterId") ?? ""), method: String(form.get("method") ?? "") },
      String(form.get("reason") ?? ""),
    );
    return "Loot corrigé.";
  }, ["/historique", "/journal"]);
}
