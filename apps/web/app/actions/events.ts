"use server";

import type { ActionState } from "@/components/actionState";
import { wallClockToInstant } from "@vxv/server/domain/dateTime";
import { getApplication } from "@/server/application";
import { formText, runCreateAction } from "@/server/formActions";
import { requireOfficer } from "@/server/session";

export async function createEvent(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  return runCreateAction(async () => {
    const application = getApplication();
    const eventId = await application.events.createEvent(
      officer,
      {
        startsAt: wallClockToInstant(formText(form, "startsAt")),
        raidIds: form.getAll("raidIds").map(String),
        softReservesPerPlayer: Number(form.get("softReservesPerPlayer")),
        roleId: formText(form, "roleId"),
      },
      formText(form, "reason"),
    );
    await application.raidAnnouncements.announceQuietly(eventId);
    return `/evenements/${eventId}`;
  }, ["/", "/journal"]);
}
