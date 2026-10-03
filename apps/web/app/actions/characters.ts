"use server";

import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { runFormAction } from "@/server/formActions";
import { requireMember } from "@/server/session";

const PAGES = ["/personnages"];

export async function linkCharacter(_previous: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  const asMain = form.get("as") === "main";
  return runFormAction(async () => {
    await getApplication().characters.link(member, String(form.get("characterId") ?? ""), asMain);
    return asMain ? "Personnage ajouté comme main." : "Personnage ajouté comme reroll.";
  }, PAGES);
}

export async function changeCharacter(_previous: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  const characterId = String(form.get("characterId") ?? "");
  return runFormAction(async () => {
    if (form.get("intent") === "main") {
      await getApplication().characters.setMain(member, characterId);
      return "Main mis à jour.";
    }
    await getApplication().characters.unlink(member, characterId);
    return "Personnage retiré.";
  }, PAGES);
}
