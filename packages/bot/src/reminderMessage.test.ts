import type { GuildEvent, RaidReminder } from "@vxv/server";
import { describe, expect, it } from "vitest";
import { emoji } from "./emojis.ts";
import { reminderMessage, softReserveReminderMessage } from "./reminderMessage.ts";

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
const start = Date.UTC(2026, 11, 12, 20) / 1000;
const lock = start - 30 * 60;

describe("raid reminder message", () => {
  it("calls the expected players, then those without soft reserves, before the lock", () => {
    const reminder: RaidReminder = { event, expected: ["1", "2"], missingSoftReserves: ["2"] };
    expect(reminderMessage(reminder, "https://vxv.test")).toEqual({
      content: [
        `${emoji("raid")} **Onyxia** <t:${start}:F> (<t:${start}:R>) · https://vxv.test/evenements/e`,
        "Inscrits : <@1> <@2>",
        `${emoji("sr")} Pas encore de SR : <@2>, à choisir sur le site avant le verrouillage (<t:${lock}:t>).`,
      ].join("\n"),
      allowed_mentions: { users: ["1", "2"] },
    });
  });

  it("invites to sign up when nobody did, pinging nobody", () => {
    const message = reminderMessage({ event, expected: [], missingSoftReserves: [] }, "https://vxv.test");
    expect(message.content).toContain("Aucun inscrit pour l'instant");
    expect(message.allowed_mentions).toEqual({ users: [] });
  });
});

describe("soft reserves' reminder message", () => {
  it("kindly asks the members without soft reserves to choose them before the lock, pinging them only", () => {
    expect(softReserveReminderMessage({ event, missing: ["2", "3"] }, "https://vxv.test")).toEqual({
      content:
        `${emoji("sr")} Petit rappel : **Onyxia** commence <t:${start}:R>. <@2> <@3>, pensez à choisir vos SR avant ` +
        `leur verrouillage, <t:${lock}:t> : https://vxv.test/evenements/e`,
      allowed_mentions: { users: ["2", "3"] },
    });
  });
});
