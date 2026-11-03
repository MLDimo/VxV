"use server";

import type { ActionState } from "@/components/actionState";
import { wallClockToInstant } from "@vxv/server/domain/dateTime";
import { eventPath, eventsPath } from "@vxv/server/domain/events";
import { getApplication } from "@/server/application";
import { formText, runRedirectAction } from "@/server/formActions";
import { requireOfficer } from "@/server/session";

export async function createEvent(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  return runRedirectAction(async () => {
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

export async function createPvpEvent(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  return runRedirectAction(async () => {
    const application = getApplication();
    const eventId = await application.events.createPvpEvent(
      officer,
      {
        title: formText(form, "title"),
        startsAt: wallClockToInstant(formText(form, "startsAt")),
        roleId: formText(form, "roleId"),
      },
      formText(form, "reason"),
    );
    await application.raidAnnouncements.announceQuietly(eventId);
    return eventPath({ id: eventId, kind: "pvp" });
  }, ["/pvp", "/journal"]);
}

export async function deleteEvent(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  return runRedirectAction(async () => {
    const application = getApplication();
    const deleted = await application.events.deleteEvent(officer, formText(form, "eventId"), formText(form, "reason"));
    await application.raidAnnouncements.withdrawQuietly(deleted);
    return eventsPath(deleted.kind);
  }, ["/", "/raid", "/pvp", "/journal"]);
}
