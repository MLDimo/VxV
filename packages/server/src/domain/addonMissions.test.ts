import { describe, expect, it } from "vitest";
import { formatAddonMissions } from "./addonMissions.ts";
import type { Character } from "./characters.ts";
import type { Mission } from "./missions.ts";

const AT = new Date("2026-10-06T20:00:00Z");
const MISSION: Mission = {
  id: "q1",
  type: "fishing",
  title: "Le Grand ; Pêcheur",
  reward: 2000,
  startsAt: new Date("2026-10-06T00:00:00Z"),
  endsAt: new Date("2026-10-13T00:00:00Z"),
  createdAt: AT,
  closedAt: undefined,
  discordMessage: undefined,
};
const character = (firstName: string, lastName: string, memberId: string | undefined): Character => ({
  id: `c-${firstName}`,
  firstName,
  lastName,
  characterClass: "HUNTER",
  memberId,
  isMain: true,
  inGuild: true,
});

describe("missions for the addon", () => {
  it("writes the missions, their ranking and rewards, and the hall of fame, one record per line", () => {
    const text = formatAddonMissions({
      missions: [
        {
          mission: MISSION,
          scores: [
            { memberId: "m-sira", memberName: "Sira Ventargent", memberClass: "HUNTER", score: 412, reachedAt: AT },
          ],
          rewards: [
            {
              missionId: "q1",
              rank: 1,
              memberId: "m-sira",
              memberName: "Sira Ventargent",
              memberClass: "HUNTER",
              amount: 1400,
              paidAt: undefined,
            },
          ],
        },
      ],
      officers: [character("Aube", "Claire", "m-aube")],
      characters: [character("Sira", "Ventargent", "m-sira"), character("Thom", "Leboss", undefined)],
      hallOfFame: [
        {
          memberId: "m-sira",
          memberName: "Sira Ventargent",
          memberClass: "HUNTER",
          wins: 5,
          gains: 6300,
          averagePosition: 2.1,
        },
      ],
      exportedAt: AT,
    });
    expect(text.split("\n")).toEqual([
      "VXV-QUETES-1",
      "P;1791316800",
      "O;Aube Claire",
      "M;m-sira;Sira Ventargent",
      "Q;q1;fishing;1791244800;1791849600;0;2000;Le Grand, Pêcheur",
      "R;q1;m-sira;Sira Ventargent;HUNTER;412;1791316800",
      "W;q1;1;Sira Ventargent;1400;0",
      "F;Sira Ventargent;HUNTER;5;6300;2.1",
    ]);
  });
});
