import { MISSION_TYPE_LABELS, MISSION_TYPES, type MissionType } from "@vxv/server";
import { MAX_MISSION_DAYS, missionEnd } from "@vxv/server/domain/missions";
import { ApplicationCommandOptionType } from "discord-api-types/v10";
import { integerOption, stringOption, type SlashCommand } from "./commands.ts";
import { actingMember } from "./members.ts";
import { ephemeral } from "./responses.ts";

/** /vxv_mission: an officer publishes a mission starting now; its message goes to the missions channel. */
export const VXV_MISSION: SlashCommand = {
  definition: {
    name: "vxv_mission",
    description: "Publier une mission de la semaine (officiers)",
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: "type",
        description: "Ce que comptent les compteurs du jeu",
        required: true,
        choices: MISSION_TYPES.map((type) => ({ name: MISSION_TYPE_LABELS[type].name, value: type })),
      },
      {
        type: ApplicationCommandOptionType.Integer,
        name: "recompense",
        description: "Récompense en po, partagée 70 / 20 / 10 % entre les trois premiers",
        required: true,
        min_value: 1,
      },
      {
        type: ApplicationCommandOptionType.String,
        name: "motif",
        description: "Motif, visible dans le journal",
        required: true,
      },
      {
        type: ApplicationCommandOptionType.String,
        name: "titre",
        description: "Titre (sinon celui du type, ex. Le Grand Pêcheur)",
      },
      {
        type: ApplicationCommandOptionType.Integer,
        name: "jours",
        description: "Durée en jours (7 par défaut)",
        min_value: 1,
        max_value: MAX_MISSION_DAYS,
      },
    ],
  },

  async run(interaction, { app, missionsChannelId }) {
    const type = stringOption(interaction, "type") as MissionType;
    const startsAt = new Date();
    const days = integerOption(interaction, "jours");
    const officer = await actingMember(interaction, app);
    const missionId = await app.missions.create(
      officer,
      {
        type,
        title: stringOption(interaction, "titre") || (MISSION_TYPE_LABELS[type]?.title ?? ""),
        reward: integerOption(interaction, "recompense") ?? 0,
        startsAt,
        endsAt: missionEnd(startsAt, days),
      },
      stringOption(interaction, "motif"),
    );
    const published = await app.missionAnnouncements.announceQuietly(missionId);
    return ephemeral(
      published
        ? `Mission publiée dans <#${missionsChannelId}>.`
        : "Mission publiée, mais Discord n'a pas pu publier son message : il le sera au prochain relevé.",
    );
  },
};
