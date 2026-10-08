import type { AnnouncedDuel, DuelStatus } from "@vxv/server";
import { colorValue, COLORS } from "@vxv/design";
import {
  ButtonStyle,
  ComponentType,
  type APIButtonComponentWithURL,
  type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { timestamp } from "./discordText.ts";
import { emoji } from "./emojis.ts";

/** The PvP place's red, as a PvP outing's message. */
const EMBED_COLOR = colorValue(COLORS.loss);

const STATUS_LINES: Record<Exclude<DuelStatus, "played">, string> = {
  proposed: "⏳ En attente de la réponse du joueur défié.",
  refused: "✋ Défi refusé.",
  scheduled: `${emoji("de")} Défi relevé : pariez sur le vainqueur jusqu'à l'heure du duel.`,
  cancelled: "❌ Duel annulé : les mises sont rendues.",
};

/** A duel's message: its players, its time and place, where it stands; the challenged member is called once. */
export function duelMessage(
  { duel, status, challenger, opponent, opponentDiscordId, winner }: AnnouncedDuel,
  siteUrl: string,
): RESTPostAPIChannelMessageJSONBody {
  const proposed = status === "proposed";
  const buttons: APIButtonComponentWithURL[] = [
    { type: ComponentType.Button, style: ButtonStyle.Link, label: "Voir sur le site", url: `${siteUrl}/pvp/duels` },
  ];
  if (duel.betId !== undefined) {
    buttons.unshift({
      type: ComponentType.Button,
      style: ButtonStyle.Link,
      label: "Parier",
      url: `${siteUrl}/paris/${duel.betId}`,
    });
  }
  return {
    content: proposed ? `<@${opponentDiscordId}>, ${challenger} te défie en duel !` : "",
    allowed_mentions: { users: proposed ? [opponentDiscordId] : [] },
    embeds: [
      {
        title: `⚔️ Duel : ${challenger} contre ${opponent}`,
        description: [
          `📅 ${timestamp(duel.scheduledAt, "F")} (${timestamp(duel.scheduledAt, "R")})`,
          `📍 ${duel.place}`,
          status === "played" ? `🏆 ${winner ?? ""} gagne le duel.` : STATUS_LINES[status],
        ].join("\n"),
        color: EMBED_COLOR,
      },
    ],
    components: [{ type: ComponentType.ActionRow, components: buttons }],
  };
}
