import {
  raidReminder,
  REMINDER_WINDOW_MS,
  SOFT_RESERVE_REMINDER_MS,
  softReserveReminder,
} from "../domain/reminders.ts";
import { SOFT_RESERVE_LOCK_BEFORE_START_MS } from "../domain/softReserves.ts";
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

    /**
     * Calls, once, the members of each raid night starting within the hour (and not locked yet) who have not chosen
     * their soft reserves: run every 5 minutes by the production database (supabase/schedules.sql). Returns how
     * many nights were reminded.
     */
    async sendSoftReservesDue(now: Date): Promise<number> {
      const from = new Date(now.getTime() + SOFT_RESERVE_LOCK_BEFORE_START_MS);
      const until = new Date(now.getTime() + SOFT_RESERVE_REMINDER_MS);
      const due = await unitOfWork.run(({ events }) => events.listSoftReservesToRemind(from, until));
      for (const event of due) {
        const targets = await unitOfWork.run(({ signups }) => signups.listReminderTargets(event.id));
        const reminder = softReserveReminder(event, targets);
        if (reminder.missing.length > 0) {
          await announcer.remindSoftReserves(reminder);
        }
        await unitOfWork.run(({ events }) => events.markSoftReservesReminded(event.id, now));
      }
      return due.length;
    },
  };
}
