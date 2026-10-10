import type { GuildEvent } from "./events.ts";
import type { SignupStatus } from "./signups.ts";

/** Events starting within this delay are reminded, by a task that runs once a day. */
export const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Members still without soft reserves are called once, this long before the raid (owner's request, 10 October). */
export const SOFT_RESERVE_REMINDER_MS = 60 * 60 * 1000;

/** A signed-up member, as the reminder needs them. */
export interface ReminderTarget {
  discordId: string;
  status: SignupStatus;
  hasSoftReserves: boolean;
}

export interface RaidReminder {
  event: GuildEvent;
  /** Discord ids of the members who answered anything but absent. */
  expected: string[];
  /** Among them, those who have not chosen their soft reserves yet. */
  missingSoftReserves: string[];
}

/** Who a raid's reminder calls: everyone signed up but the absent, and who still has soft reserves to choose. */
export function raidReminder(event: GuildEvent, targets: readonly ReminderTarget[]): RaidReminder {
  const expected = targets.filter((target) => target.status !== "absent");
  return {
    event,
    expected: expected.map((target) => target.discordId),
    missingSoftReserves:
      event.softReservesPerPlayer > 0
        ? expected.filter((target) => !target.hasSoftReserves).map((target) => target.discordId)
        : [],
  };
}

/** The members signed up to a raid night, but the absent, who have not chosen their soft reserves yet. */
export interface SoftReserveReminder {
  event: GuildEvent;
  /** Their Discord ids. */
  missing: string[];
}

/** Who the soft reserves' reminder calls, as the raid's reminder counts them. */
export function softReserveReminder(event: GuildEvent, targets: readonly ReminderTarget[]): SoftReserveReminder {
  return { event, missing: raidReminder(event, targets).missingSoftReserves };
}
