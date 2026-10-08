import { describe, expect, it } from "vitest";
import type { GuildEvent } from "./events.ts";
import { raidReminder, type ReminderTarget } from "./reminders.ts";

const event: GuildEvent = {
  id: "e",
  startsAt: new Date("2026-12-12T20:00:00Z"),
  softReservesPerPlayer: 1,
  raids: [{ id: "onyxia", name: "Onyxia" }],
  kind: "raid",
  title: undefined,
  role: undefined,
  discordMessageId: undefined,
};

const targets: ReminderTarget[] = [
  { discordId: "1", status: "present", hasSoftReserves: true },
  { discordId: "2", status: "late", hasSoftReserves: false },
  { discordId: "3", status: "maybe", hasSoftReserves: false },
  { discordId: "4", status: "bench", hasSoftReserves: true },
  { discordId: "5", status: "absent", hasSoftReserves: false },
];

describe("raidReminder", () => {
  it("calls everyone signed up but the absent, and those still without soft reserves", () => {
    expect(raidReminder(event, targets)).toEqual({
      event,
      expected: ["1", "2", "3", "4"],
      missingSoftReserves: ["2", "3"],
    });
  });

  it("asks nobody for soft reserves when the event has none", () => {
    expect(raidReminder({ ...event, softReservesPerPlayer: 0 }, targets).missingSoftReserves).toEqual([]);
  });
});
