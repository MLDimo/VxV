import type { RaidReminder } from "@vxv/server";
import { eventTitle } from "@vxv/server/domain/labels";
import { softReservesLockAt } from "@vxv/server/domain/softReserves";
import type { RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";
import { timestamp } from "./discordText.ts";
import { emoji, EVENT_EMOJIS } from "./emojis.ts";
import { eventUrl } from "./raidMessage.ts";

const mentions = (discordIds: readonly string[]) => discordIds.map((discordId) => `<@${discordId}>`).join(" ");

/** The reminder of a raid: who is expected, and who still has soft reserves to choose before the lock. */
export function reminderMessage(
  { event, expected, missingSoftReserves }: RaidReminder,
  siteUrl: string,
): RESTPostAPIChannelMessageJSONBody {
  const title = eventTitle(event);
  const lines = [
    `${emoji(EVENT_EMOJIS[event.kind])} **${title}** ${timestamp(event.startsAt, "F")} (${timestamp(event.startsAt, "R")}) · ${eventUrl(siteUrl, event)}`,
    expected.length > 0
      ? `Inscrits : ${mentions(expected)}`
      : "Aucun inscrit pour l'instant : inscrivez-vous avec le bouton du message de l'événement, ou sur le site.",
  ];
  if (missingSoftReserves.length > 0) {
    lines.push(
      `${emoji("sr")} Pas encore de SR : ${mentions(missingSoftReserves)}, à choisir sur le site avant le verrouillage ` +
        `(${timestamp(softReservesLockAt(event.startsAt), "t")}).`,
    );
  }
  return { content: lines.join("\n"), allowed_mentions: { users: expected } };
}
