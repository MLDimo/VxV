"use server";

import type { ActionState } from "@/components/actionState";
import { eventPath } from "@vxv/server/domain/events";
import { getApplication } from "@/server/application";
import { formText, runFormAction } from "@/server/formActions";
import { requireMember } from "@/server/session";

export async function signUp(_previous: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  const eventId = formText(form, "eventId");
  // The page of a raid night or of a PvP outing: refreshing both costs nothing.
  return runFormAction(async () => {
    const application = getApplication();
    await application.signups.signUp(member, eventId, {
      characterId: formText(form, "characterId"),
      role: formText(form, "role"),
      spec: formText(form, "spec"),
      status: formText(form, "status"),
    });
    await application.raidAnnouncements.announceQuietly(eventId);
    return "Inscription enregistrée.";
  }, [eventPath({ id: eventId, kind: "raid" }), eventPath({ id: eventId, kind: "pvp" })]);
}
