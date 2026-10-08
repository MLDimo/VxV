import type { RaidRecap } from "@vxv/server";
import { count, formatDuration, LOOT_METHOD_LABELS, eventTitle } from "@vxv/server/domain/labels";
import type { RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";
import { timestamp } from "./discordText.ts";
import { emoji } from "./emojis.ts";
import { eventUrl } from "./raidMessage.ts";

/** Longest message Discord accepts. */
const MAX_CONTENT_LENGTH = 2000;

function killsLine({ kills, durationMs }: RaidRecap): string {
  if (kills.length === 0) {
    return `${emoji("raid")} Aucun boss tué.`;
  }
  const duration = durationMs !== undefined ? ` en ${formatDuration(durationMs)}` : "";
  return `${emoji("raid")} ${count(kills.length, "boss tué", "boss tués")}${duration} : ${kills.join(", ")}`;
}

function lootsLine({ loots }: RaidRecap): string {
  if (loots.length === 0) {
    return `${emoji("loot")} Aucun objet donné.`;
  }
  return `${emoji("loot")} ${loots.map((loot) => `${loot.itemName} → ${loot.winnerName} (${LOOT_METHOD_LABELS[loot.method]})`).join(" · ")}`;
}

function deathsLine({ deaths }: RaidRecap): string {
  return deaths.length === 0
    ? "💀 Aucune mort."
    : `💀 Morts : ${deaths.map((death) => `${death.name} ×${String(death.count)}`).join(", ")}`;
}

/** The end-of-raid recap (plan 6.10): bosses killed and duration, items given and how, deaths. Pings nobody. */
export function recapMessage(recap: RaidRecap, siteUrl: string): RESTPostAPIChannelMessageJSONBody {
  const { event } = recap;
  const title = eventTitle(event);
  const content = [
    `${emoji("journal")} **Récap · ${title}** ${timestamp(event.startsAt, "D")} · ${eventUrl(siteUrl, event)}`,
    killsLine(recap),
    lootsLine(recap),
    deathsLine(recap),
  ].join("\n");
  return {
    content: content.length > MAX_CONTENT_LENGTH ? `${content.slice(0, MAX_CONTENT_LENGTH - 1)}…` : content,
    allowed_mentions: { parse: [] },
  };
}
