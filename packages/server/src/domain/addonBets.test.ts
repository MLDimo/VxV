import { describe, expect, it } from "vitest";
import { formatAddonBets } from "./addonBets.ts";
import type { Bet, Stake } from "./bets.ts";
import type { Character } from "./characters.ts";

const AT = new Date("2026-10-06T20:00:00Z");
const BET: Bet = {
  id: "bet",
  title: "Qui meurt ; en premier ?",
  choices: [
    { id: "tank", label: "Un tank" },
    { id: "heal", label: "Un heal" },
  ],
  closesAt: new Date("2026-10-08T19:00:00Z"),
  createdAt: AT,
  discordMessage: undefined,
  endedAt: undefined,
  winningChoiceId: undefined,
};
const STAKE: Stake = {
  id: "stake",
  betId: "bet",
  memberId: "member",
  memberName: "Ðéjà Vu",
  memberClass: "ROGUE",
  choiceId: "tank",
  amount: 50,
  placedAt: AT,
  paidAt: undefined,
  outcome: undefined,
  gain: undefined,
  collectedAt: undefined,
};
const character = (firstName: string, lastName: string, memberId: string | undefined): Character => ({
  id: `${firstName}-${lastName}`,
  firstName,
  lastName,
  characterClass: "ROGUE",
  memberId,
  isMain: true,
  inGuild: true,
});

describe("bets for the addon", () => {
  it("writes the bets, their stakes, the guild's cash, the ranking and the answers, one record per line", () => {
    const text = formatAddonBets({
      bets: [{ bet: BET, stakes: [STAKE] }],
      officers: [character("Aube", "Claire", "officer")],
      characters: [character("Ðéjà", "Vu", "member"), character("Thom", "Leboss", undefined)],
      cash: {
        balance: 380,
        entries: 500,
        exits: -120,
        movements: [
          {
            id: "1",
            occurredAt: AT,
            kind: "expense",
            amount: -120,
            label: "Flacons",
            reason: "Raid",
            recordedByName: "Trésorier",
            memberName: undefined,
          },
        ],
      },
      ranking: [
        {
          rank: 1,
          memberId: "member",
          memberName: "Ðéjà Vu",
          memberClass: "ROGUE",
          memberRace: undefined,
          memberSex: undefined,
          net: 30,
          won: 180,
          bets: 2,
          successRate: 0.5,
          debt: 0,
        },
      ],
      changes: [
        {
          id: "Ðéjà Vu#1#2",
          eventId: undefined,
          betId: "bet",
          author: "Ðéjà Vu",
          accepted: true,
          message: "Mise enregistrée.",
        },
      ],
      exportedAt: AT,
    });
    expect(text.split("\n")).toEqual([
      "VXV-PARIS-1",
      "P;1791316800",
      "O;Aube Claire",
      "M;member;Ðéjà Vu",
      "B;bet;1791486000;0;;Qui meurt, en premier ?",
      "H;bet;tank;Un tank",
      "H;bet;heal;Un heal",
      "S;bet;member;Ðéjà Vu;ROGUE;tank;50;toPay;0",
      "T;380;500;-120",
      "K;1791316800;-120;Flacons",
      "R;1;Ðéjà Vu;ROGUE;30;2",
      "C;Ðéjà Vu#1#2;1;Mise enregistrée.",
    ]);
  });
});
