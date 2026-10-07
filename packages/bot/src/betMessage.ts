import type { AnnouncedBet } from "@vxv/server";
import { betBook, ORGANISATION_PERCENT } from "@vxv/server/domain/bets";
import { count, formatGold, formatOdds, formatShare } from "@vxv/server/domain/labels";
import {
  ButtonStyle,
  ComponentType,
  type APIEmbedField,
  type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { timestamp } from "./discordText.ts";

/** Le Dé Pipé's ink (§7.7, stamp of the bets). */
const EMBED_COLOR = 0xb0306e;

/** The buttons of a bet's message, read back when a member clicks them. */
export const BET_BUTTON_PREFIX = "bet:";
export const BET_WITHDRAW_PREFIX = "bet-withdraw:";

function betUrl(siteUrl: string, betId: string): string {
  return `${siteUrl}/paris/${betId}`;
}

/** How a closed bet stands: waiting for its result, won by a choice, or cancelled. */
function ending(
  { closesAt, endedAt, winningChoiceId, choices }: AnnouncedBet["bet"],
  stakes: AnnouncedBet["stakes"],
  pool: number,
) {
  if (endedAt === undefined) {
    return `🔒 Fermé depuis ${timestamp(closesAt, "F")} : le résultat sera déclaré par un officier.`;
  }
  const winner = choices.find((choice) => choice.id === winningChoiceId);
  if (winner === undefined) {
    return "↩️ Pari annulé : chaque mise est rendue par le trésorier.";
  }
  const winners = stakes.filter((stake) => stake.outcome === "won");
  const shared = winners.reduce((total, stake) => total + (stake.gain ?? 0), 0);
  return (
    `🏆 Résultat : « ${winner.label} » · ${count(winners.length, "gagnant")}, ` +
    `${formatGold(pool - shared)} pour la caisse. Gains à récupérer auprès du trésorier.`
  );
}

/** The bet's message: when it closes, the pool, and each choice's share and odds; the buttons while it is open. */
export function betMessage({ bet, stakes, open }: AnnouncedBet, siteUrl: string): RESTPostAPIChannelMessageJSONBody {
  const book = betBook(bet, stakes);
  const closing = open
    ? `⏳ Fermeture ${timestamp(bet.closesAt, "F")} (${timestamp(bet.closesAt, "R")})`
    : ending(bet, stakes, book.pool);
  const pool =
    `💰 Cagnotte ${formatGold(book.pool)} · ${count(book.bettors, "parieur")} · ` +
    `${String(ORGANISATION_PERCENT)} % pour la caisse de la guilde`;
  const fields: APIEmbedField[] = book.choices.map(({ choice, total, bettors, share, odds }) => ({
    name: `${choice.label} · ${formatOdds(odds)}`,
    value: total === 0 ? "Aucune mise" : `${formatShare(share)} · ${formatGold(total)} · ${count(bettors, "parieur")}`,
    inline: true,
  }));
  return {
    embeds: [
      {
        title: `🎲 ${bet.title}`,
        url: betUrl(siteUrl, bet.id),
        description: `${closing}\n${pool}`,
        color: EMBED_COLOR,
        fields,
        footer: {
          text: open
            ? "Mise en po, 1 po au moins, à payer au trésorier ; modifiable tant qu'elle n'est pas payée."
            : "Les cotes sont définitives. Une mise perdue non payée devient une dette.",
        },
      },
    ],
    components: open
      ? [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                style: ButtonStyle.Primary,
                label: "Miser",
                custom_id: `${BET_BUTTON_PREFIX}${bet.id}`,
              },
              {
                type: ComponentType.Button,
                style: ButtonStyle.Secondary,
                label: "Retirer ma mise",
                custom_id: `${BET_WITHDRAW_PREFIX}${bet.id}`,
              },
            ],
          },
        ]
      : [],
  };
}
