import { MAX_CHOICES } from "@vxv/server";
import { parseRaidStart } from "@vxv/server/domain/raidStart";
import { ApplicationCommandOptionType } from "discord-api-types/v10";
import { stringOption, type SlashCommand } from "./commands.ts";
import { actingMember } from "./members.ts";
import { ephemeral } from "./responses.ts";

/** The choices are typed in one option, separated by this. */
export const CHOICE_SEPARATOR = ";";
const INVALID_DATE = "Date ou heure de fermeture invalide : écris par exemple 12/12/2026 (ou 12/12) et 21:00.";

/** /vxv_pari: an officer opens a bet from Discord; its message is published in the bets channel. */
export const VXV_PARI: SlashCommand = {
  definition: {
    name: "vxv_pari",
    description: "Ouvrir un pari (officiers)",
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: "titre",
        description: "La question, ex. Qui meurt en premier sur le boss 10 ?",
        required: true,
      },
      {
        type: ApplicationCommandOptionType.String,
        name: "choix",
        description: `De 2 à ${String(MAX_CHOICES)} choix séparés par « ${CHOICE_SEPARATOR} », ex. Un tank ; Un heal`,
        required: true,
      },
      {
        type: ApplicationCommandOptionType.String,
        name: "date",
        description: "Date de fermeture, ex. 12/12/2026 ou 12/12",
        required: true,
      },
      {
        type: ApplicationCommandOptionType.String,
        name: "heure",
        description: "Heure de fermeture, ex. 21:00",
        required: true,
      },
      {
        type: ApplicationCommandOptionType.String,
        name: "motif",
        description: "Motif, visible dans le journal",
        required: true,
      },
    ],
  },

  async run(interaction, { app, betsChannelId }) {
    const closesAt = parseRaidStart(stringOption(interaction, "date"), stringOption(interaction, "heure"), new Date());
    if (closesAt === undefined) {
      return ephemeral(INVALID_DATE);
    }
    const officer = await actingMember(interaction, app);
    const betId = await app.bets.create(
      officer,
      {
        title: stringOption(interaction, "titre"),
        choices: stringOption(interaction, "choix").split(CHOICE_SEPARATOR),
        closesAt,
      },
      stringOption(interaction, "motif"),
    );
    const published = await app.betAnnouncements.announceQuietly(betId);
    return ephemeral(
      published
        ? `Pari ouvert et publié dans <#${betsChannelId}>.`
        : "Pari ouvert, mais Discord n'a pas pu publier son message : il le sera à la première mise.",
    );
  },
};
