import type { AnnouncedTitles } from "@vxv/server";
import { titleRole } from "@vxv/server";
import type { RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";

/** Ranking's gold (§2.5). */
const EMBED_COLOR = 0xf2c94c;

/** The week's titles (P13.5): each title, its holder and its rule. */
export function titlesMessage({ holders }: AnnouncedTitles, siteUrl: string): RESTPostAPIChannelMessageJSONBody {
  return {
    embeds: [
      {
        title: "👑 Les titres de la semaine",
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
