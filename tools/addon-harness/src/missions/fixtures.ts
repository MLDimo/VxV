import { formatAddonMissions, type AddonMissionsFacts } from "@vxv/server/domain/addonMissions";
import type { Mission } from "@vxv/server/domain/missions";
import { loadedBundle, startCore, type CoreStart } from "../core.ts";
import { EXPORTED, GUILD_READERS } from "../siteFixtures.ts";
import { companionFiles } from "../sync/fixtures.ts";

/** A mission of the week, running at the mocked client's time (10 December, morning). */
export function mission(id: string, type: Mission["type"], title: string, extra: Partial<Mission> = {}): Mission {
  return {
    id,
    type,
    title,
    reward: 2000,
    startsAt: new Date("2026-12-07T00:00:00Z"),
    endsAt: new Date("2026-12-14T00:00:00Z"),
    createdAt: EXPORTED,
    closedAt: undefined,
    discordMessage: undefined,
    ...extra,
  };
}

/** The guild's quests: Le Chasseur de têtes (honorable kills, read in game), Thom Leboss ahead with 12. */
export const GUILD_QUESTS: AddonMissionsFacts = {
  missions: [
    {
      mission: mission("q1", "honorableKills", "Le Chasseur de têtes"),
      scores: [
        {
          memberId: "m-thom",
          memberName: "Thom Leboss",
          memberClass: "PRIEST",
          score: 12,
          reachedAt: new Date("2026-12-09T20:00:00Z"),
        },
      ],
      rewards: [],
    },
  ],
  ...GUILD_READERS,
  hallOfFame: [
    {
      memberId: "m-thom",
      memberName: "Thom Leboss",
      memberClass: "PRIEST",
      wins: 2,
      gains: 1800,
      averagePosition: 1.5,
    },
  ],
  changes: [],
  exportedAt: EXPORTED,
};

export function questsText(facts: AddonMissionsFacts = GUILD_QUESTS): string {
  return formatAddonMissions(facts);
}

/** The core, Missions and Sync on a mocked client, the companion having brought the quests. */
export function startQuests(options: CoreStart & { facts?: AddonMissionsFacts } = {}) {
  const { facts, ...core } = options;
  const started = startCore({
    written: companionFiles({ quetes: questsText(facts) }),
    ...core,
    bundles: ["Missions", "Sync"],
  });
  return { ...started, quests: loadedBundle(started, "Missions") };
}
