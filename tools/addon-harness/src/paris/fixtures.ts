import { formatAddonBets, type AddonBetsFacts } from "@vxv/server/domain/addonBets";
import type { Bet, Stake } from "@vxv/server/domain/bets";
import { loadedBundle, startCore, type CoreStart } from "../core.ts";
import { EXPORTED, GUILD_READERS } from "../siteFixtures.ts";
import { companionFiles } from "../sync/fixtures.ts";

export const TITLE = "Qui meurt en premier sur le boss 10 ?";

export function stake(memberId: string, memberName: string, choiceId: string, amount: number): Stake {
  return {
    id: `s-${memberId}`,
    betId: "b1",
    memberId,
    memberName,
    memberClass: "PRIEST",
    choiceId,
    amount,
    placedAt: EXPORTED,
    paidAt: undefined,
    outcome: undefined,
    gain: undefined,
    collectedAt: undefined,
  };
}

export const BOSS_TEN: Bet = {
  id: "b1",
  title: TITLE,
  choices: [
    { id: "tank", label: "Un tank" },
    { id: "heal", label: "Un heal" },
  ],
  closesAt: new Date("2026-12-10T20:00:00Z"),
  createdAt: EXPORTED,
  discordMessage: undefined,
  endedAt: undefined,
  winningChoiceId: undefined,
};

/** The bets as the website knows them: Ðéjà Vu, an officer, has 50 po on the tank, Thom Leboss 150 on the heal. */
export const TAVERN_BETS: AddonBetsFacts = {
  bets: [
    {
      bet: BOSS_TEN,
      stakes: [stake("m-deja", "Ðéjà Vu", "tank", 50), stake("m-thom", "Thom Leboss", "heal", 150)],
    },
  ],
  ...GUILD_READERS,
  cash: {
    balance: 380,
    entries: 500,
    exits: -120,
    movements: [
      {
        id: "1",
        occurredAt: new Date("2026-12-09T20:00:00Z"),
        kind: "expense",
        amount: -120,
        label: "Flacons",
        reason: "Raid",
        recordedByName: "Trésorier",
        memberId: undefined,
        memberName: undefined,
      },
    ],
  },
  ranking: [
    {
      rank: 1,
      memberId: "m-thom",
      memberName: "Thom Leboss",
      memberClass: "PRIEST",
      memberRace: undefined,
      memberSex: undefined,
      net: 30,
      won: 180,
      bets: 2,
      successRate: 0.5,
      debt: 0,
    },
  ],
  changes: [],
  exportedAt: EXPORTED,
};

/** The text the companion brings (VXV-PARIS-1), from the website's own format. */
export function parisText(facts: AddonBetsFacts = TAVERN_BETS): string {
  return formatAddonBets(facts);
}

/** VXV_Core, VXV_Paris and VXV_Sync on a mocked client, the companion having brought the bets. */
export function startParis(options: CoreStart & { facts?: AddonBetsFacts; withRaid?: boolean } = {}) {
  const { facts, withRaid = false, ...core } = options;
  const started = startCore({
    written: companionFiles({ paris: parisText(facts) }),
    ...core,
    bundles: withRaid ? ["VXV_Raid", "VXV_Paris", "VXV_Sync"] : ["VXV_Paris", "VXV_Sync"],
  });
  return { ...started, paris: loadedBundle(started, "VXV_Paris") };
}
