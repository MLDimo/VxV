import type { AnnouncedTitles } from "@vxv/server";
import { colorValue, COLORS } from "@vxv/design";
import { titleRole } from "@vxv/server";
import type { RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";
import { emoji } from "./emojis.ts";

/** Ranking's gold (§2.5). */
const EMBED_COLOR = colorValue(COLORS.gold);

/** The week's titles (P13.5): each title, its holder and its rule. */
export function titlesMessage({ holders }: AnnouncedTitles, siteUrl: string): RESTPostAPIChannelMessageJSONBody {
  return {
    embeds: [
      {
        title: `${emoji("ranking")} Les titres de la semaine`,
        url: `${siteUrl}/ranking/titres`,
        description: "Chaque mercredi, les titres vont aux membres en tête sur la saison. Un rôle Discord par titre.",
        color: EMBED_COLOR,
        fields: holders.map(({ title, rule, holder }) => ({
          name: titleRole(title),
          value: `${holder === undefined ? "Personne cette semaine" : `**${holder}**`}\n${rule}`,
          inline: true,
        })),
      },
    ],
  };
}
