import type { AnnouncedDeathroll } from "@vxv/server";
import { formatGold } from "@vxv/server/domain/labels";
import type { RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";
import { emoji } from "./emojis.ts";

/** A deathroll played for a big stake (P15.5), told in the bets' channel. */
export function deathrollMessage(
  { winner, loser, stake, rolls }: AnnouncedDeathroll,
  siteUrl: string,
): RESTPostAPIChannelMessageJSONBody {
  return {
    content: `${emoji("deathroll")} **Deathroll à ${formatGold(stake)}** : ${winner} bat ${loser} en ${String(rolls)} rolls. ${siteUrl}/paris/deathroll`,
    allowed_mentions: { parse: [] },
  };
}
