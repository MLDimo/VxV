import { raidReminder, REMINDER_WINDOW_MS } from "../domain/reminders.ts";
import type { UnitOfWork } from "./ports.ts";
import type { EventAnnouncer } from "./discordPorts.ts";

export function createRaidReminders({ unitOfWork, announcer }: { unitOfWork: UnitOfWork; announcer: EventAnnouncer }) {
  return {
    /** Reminds every event starting within a day, once: run by a daily task. Returns how many were reminded. */
    async sendDue(now: Date): Promise<number> {
      const until = new Date(now.getTime() + REMINDER_WINDOW_MS);
      const due = await unitOfWork.run(({ events }) => events.listToRemind(now, until));
      for (const event of due) {
        const targets = await unitOfWork.run(({ signups }) => signups.listReminderTargets(event.id));
        await announcer.remind(raidReminder(event, targets));
        await unitOfWork.run(({ events }) => events.markReminded(event.id, now));
      }
      return due.length;
    },
  };
}
