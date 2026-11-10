import type { AnnouncedMission } from "@vxv/server";
import { colorValue, COLORS } from "@vxv/design";
import { formatGold, formatPlace } from "@vxv/server/domain/labels";
import {
  formatMissionScore,
  MISSION_TYPE_LABELS,
  missionGoal,
  missionRewards,
  REWARD_SHARES,
  TOP_LEVEL,
  type MissionType,
} from "@vxv/server/domain/missions";
import type { RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";
import { timestamp } from "./discordText.ts";
import { emoji } from "./emojis.ts";

/** Les Quêtes' green (§2.5). */
const EMBED_COLOR = colorValue(COLORS.gain);
/** The first five of the ranking (§7.4). */
const SHOWN_SCORES = 5;

function missionUrl(siteUrl: string, missionId: string): string {
  return `${siteUrl}/quetes/${missionId}`;
}

function statusLine({ mission, status }: AnnouncedMission): string {
  switch (status) {
    case "upcoming":
      return `⏳ Commence ${timestamp(mission.startsAt, "R")}`;
    case "running":
      return `🎯 Se termine ${timestamp(mission.endsAt, "R")}`;
    case "ended":
      return "🔒 Terminée : le résultat sera validé par un officier.";
    case "closed":
      return "🏆 Résultat validé : récompenses versées par le trésorier.";
  }
}

/** The mission's message (P12.2, P12.5): what counts, its span, its reward, and the first five. */
export function missionMessage(announced: AnnouncedMission, siteUrl: string): RESTPostAPIChannelMessageJSONBody {
  const { mission, scores } = announced;
  const labels = MISSION_TYPE_LABELS[mission.type];
  const shares = REWARD_SHARES.map(
    (share, index) => `${formatPlace(index + 1)} ${formatGold(Math.floor((mission.reward * share) / 100))}`,
  ).join(" · ");
  const rewards = missionRewards(mission.type, scores, mission.reward);
  const ranking = scores.slice(0, SHOWN_SCORES).map((score, index) => {
    const reward = rewards.find((candidate) => candidate.memberId === score.memberId);
    const prize = announced.status === "closed" && reward !== undefined ? ` · ${formatGold(reward.amount)}` : "";
    return `${String(index + 1)}. ${score.memberName} — ${formatMissionScore(mission.type, score.score)}${prize}`;
  });
  return {
    embeds: [
      {
        title: `${emoji("quete")} ${mission.title}`,
        url: missionUrl(siteUrl, mission.id),
        description:
          `${labels.name} : ${missionGoal(mission.type)}, du ${timestamp(mission.startsAt, "D")} au ` +
          `${timestamp(mission.endsAt, "D")}\n${statusLine(announced)}`,
        color: EMBED_COLOR,
        fields: [
          { name: `${emoji("po")} Récompense : ${formatGold(mission.reward)}`, value: shares },
          { name: "Classement", value: ranking.length === 0 ? "Personne pour l'instant." : ranking.join("\n") },
        ],
        footer: { text: "Toute la guilde participe : l'addon VXV et le compagnon relèvent les compteurs du jeu." },
      },
    ],
  };
}

/** Why a validated mission has nobody on its podium: nobody took part, or in the race nobody reached the top level. */
function noPodium(type: MissionType, scores: readonly unknown[]): string {
  return scores.length > 0 && type === "level60"
    ? `Personne n'a atteint le niveau ${String(TOP_LEVEL)} : pas de gagnant.`
    : "Personne n'a participé.";
}

/** The results of a mission an officer validated (owner's request of 14 October): its podium and the rewards. */
export function missionResultsMessage(announced: AnnouncedMission, siteUrl: string): RESTPostAPIChannelMessageJSONBody {
  const { mission, scores } = announced;
  const labels = MISSION_TYPE_LABELS[mission.type];
  const podium = missionRewards(mission.type, scores, mission.reward).map((reward) => {
    const score = scores.find((candidate) => candidate.memberId === reward.memberId);
    return (
      `${formatPlace(reward.rank)} ${score?.memberName ?? ""} — ${formatMissionScore(mission.type, score?.score ?? 0)}` +
      ` · ${formatGold(reward.amount)}`
    );
  });
  return {
    embeds: [
      {
        title: `🏆 Résultats · ${mission.title}`,
        url: missionUrl(siteUrl, mission.id),
        description:
          `${labels.name} : ${missionGoal(mission.type)}, du ${timestamp(mission.startsAt, "D")} au ` +
          `${timestamp(mission.endsAt, "D")}. Résultat validé par un officier.`,
        color: EMBED_COLOR,
        fields: [{ name: "Podium", value: podium.length > 0 ? podium.join("\n") : noPodium(mission.type, scores) }],
        footer: { text: "Le trésorier verse les récompenses." },
      },
    ],
  };
}
