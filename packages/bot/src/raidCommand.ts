import { DEFAULT_SOFT_RESERVES, MAX_SOFT_RESERVES } from "@vxv/server";
import { normalizeForSearch } from "@vxv/server/domain/characterSearch";
import {
  ApplicationCommandOptionType,
  InteractionResponseType,
  type APIChatInputApplicationCommandGuildInteraction,
} from "discord-api-types/v10";
import {
  focusedOption,
  integerOption,
  roleOption,
  stringOption,
  type BotContext,
  type SlashCommand,
} from "./commands.ts";
import { parseRaidStart } from "@vxv/server/domain/raidStart";
import { actingMember } from "./members.ts";
import { ephemeral } from "./responses.ts";

const RAID_OPTIONS = ["raid", "raid2"];
/** Discord shows at most 25 suggestions. */
const MAX_SUGGESTIONS = 25;
export const INVALID_DATE = "Date ou heure invalide : écris par exemple 12/12/2026 (ou 12/12) et 21:00.";

/** When an event starts and who may sign up, as /vxv_raid and /vxv_pvp ask it; Discord wants the required first. */
export const EVENT_OPTIONS = {
  start: [
    {
      type: ApplicationCommandOptionType.String,
      name: "date",
      description: "Date, ex. 12/12/2026 ou 12/12",
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: "heure",
      description: "Heure de début, ex. 21:00",
      required: true,
    },
    {
      type: ApplicationCommandOptionType.Role,
      name: "role",
      description: "Qui peut s'inscrire : les membres de ce rôle, ou @everyone pour tout le monde",
      required: true,
    },
  ],
  reason: {
    type: ApplicationCommandOptionType.String,
    name: "motif",
    description: "Motif, visible dans le journal",
    required: true,
  },
} as const;

/** The event an officer plans from Discord: when (undefined when unreadable) and the role chosen. */
export function plannedOptions(interaction: APIChatInputApplicationCommandGuildInteraction) {
  return {
    startsAt: parseRaidStart(stringOption(interaction, "date"), stringOption(interaction, "heure"), new Date()),
    roleId: roleOption(interaction, "role"),
    reason: stringOption(interaction, "motif"),
  };
}

/** Publishes the new event's sign-up message in its channel, and tells the officer. */
export async function announcedReply({ app }: BotContext, eventId: string, channelId: string) {
  const published = await app.raidAnnouncements.announceQuietly(eventId);
  return ephemeral(
    published
      ? `Événement créé et publié dans <#${channelId}>.`
      : "Événement créé, mais Discord n'a pas pu publier son message : il le sera à la prochaine inscription.",
  );
}

/** A raid picked in the suggestions gives its id; a name typed in full also matches. */
async function raidIds({ app }: BotContext, values: readonly string[]): Promise<string[]> {
  const raids = await app.events.listRaids();
  return values
    .filter((value) => value.trim() !== "")
    .map(
      (value) =>
        raids.find((raid) => raid.id === value || normalizeForSearch(raid.name) === normalizeForSearch(value))?.id ??
        value,
    );
}

/**
 * /vxv_raid: an officer plans a raid night from Discord, for the members of a role (@everyone: everybody); its sign-up
 * message is published in the raid channel.
 */
export const VXV_RAID: Required<SlashCommand> = {
  definition: {
    name: "vxv_raid",
    description: "Créer un événement de raid (officiers)",
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: "raid",
        description: "Raid joué",
        required: true,
        autocomplete: true,
      },
      ...EVENT_OPTIONS.start,
      EVENT_OPTIONS.reason,
      {
        type: ApplicationCommandOptionType.String,
        name: "raid2",
        description: "Second raid de la soirée",
        autocomplete: true,
      },
      {
        type: ApplicationCommandOptionType.Integer,
        name: "sr",
        description: `Nombre de SR par joueur (${DEFAULT_SOFT_RESERVES} par défaut)`,
        min_value: 0,
        max_value: MAX_SOFT_RESERVES,
      },
    ],
  },

  async run(interaction, context) {
    const { startsAt, roleId, reason } = plannedOptions(interaction);
    if (startsAt === undefined) {
      return ephemeral(INVALID_DATE);
    }
    const { app } = context;
    const officer = await actingMember(interaction, app);
    const eventId = await app.events.createEvent(
      officer,
      {
        startsAt,
        raidIds: await raidIds(
          context,
          RAID_OPTIONS.map((option) => stringOption(interaction, option)),
        ),
        softReservesPerPlayer: integerOption(interaction, "sr") ?? DEFAULT_SOFT_RESERVES,
        roleId,
      },
      reason,
    );
    return announcedReply(context, eventId, context.raidChannelId);
  },

  async autocomplete(interaction, { app }) {
    const typed = normalizeForSearch(focusedOption(interaction).value);
    const raids = (await app.events.listRaids()).filter((raid) => normalizeForSearch(raid.name).includes(typed));
    return {
      type: InteractionResponseType.ApplicationCommandAutocompleteResult,
      data: { choices: raids.slice(0, MAX_SUGGESTIONS).map((raid) => ({ name: raid.name, value: raid.id })) },
    };
  },
};
