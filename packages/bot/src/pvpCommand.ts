import { MAX_EVENT_TITLE_LENGTH } from "@vxv/server";
import { ApplicationCommandOptionType } from "discord-api-types/v10";
import { stringOption, type SlashCommand } from "./commands.ts";
import { actingMember } from "./members.ts";
import { announcedReply, EVENT_OPTIONS, INVALID_DATE, plannedOptions } from "./raidCommand.ts";
import { ephemeral } from "./responses.ts";

/**
 * /vxv_pvp: an officer plans a PvP outing from Discord, as /vxv_raid a raid night, with a title instead of raids; its
 * sign-up message is published in the PvP channel.
 */
export const VXV_PVP: SlashCommand = {
  definition: {
    name: "vxv_pvp",
    description: "Créer un événement PvP (officiers)",
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: "titre",
        description: "Titre de l'événement, ex. Raid sur Astranaar",
        required: true,
        max_length: MAX_EVENT_TITLE_LENGTH,
      },
      ...EVENT_OPTIONS.start,
      EVENT_OPTIONS.reason,
    ],
  },

  async run(interaction, context) {
    const { startsAt, roleId, reason } = plannedOptions(interaction);
    if (startsAt === undefined) {
      return ephemeral(INVALID_DATE);
    }
    const officer = await actingMember(interaction, context.app);
    const eventId = await context.app.events.createPvpEvent(
      officer,
      { title: stringOption(interaction, "titre"), startsAt, roleId },
      reason,
    );
    return announcedReply(context, eventId, context.pvpChannelId);
  },
};
