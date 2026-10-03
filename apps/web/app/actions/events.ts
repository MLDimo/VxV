"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/actionState";
import { wallClockToInstant } from "@vxv/server/domain/dateTime";
import { getApplication } from "@/server/application";
import { runFormAction } from "@/server/formActions";
import { requireOfficer } from "@/server/session";

export async function createEvent(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  let eventId: string | undefined;
  const state = await runFormAction(async () => {
    const application = getApplication();
    eventId = await application.events.createEvent(
      officer,
      {
        startsAt: wallClockToInstant(String(form.get("startsAt") ?? "")),
        raidIds: form.getAll("raidIds").map(String),
        softReservesPerPlayer: Number(form.get("softReservesPerPlayer")),
      },
      String(form.get("reason") ?? ""),
    );
    await application.raidAnnouncements.announceQuietly(eventId);
    return "Événement créé.";
  }, ["/", "/journal"]);
  if (eventId !== undefined) {
    redirect(`/evenements/${eventId}`);
  }
  return state;
}
