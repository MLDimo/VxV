import { describe, expect, it } from "vitest";
import {
  type CounterReading,
  defaultEnd,
  endedAgo,
  hallOfFame,
  missionPitch,
  missionProgress,
  missionRewards,
  type MissionScore,
  missionScores,
  mostOf,
  newMissionRefusal,
} from "./missions.ts";

const START = new Date("2026-10-06T00:00:00Z");
const END = new Date("2026-10-13T00:00:00Z");
const MISSION = { type: "fishing" as const, startsAt: START, endsAt: END };
const at = (day: number, hour = 20) => new Date(Date.UTC(2026, 9, day, hour));

function reading(characterId: string, memberId: string, value: number, readAt: Date, type = "fishing" as const) {
  return {
    characterId,
    memberId,
    memberName: memberId,
    memberClass: undefined,
    type,
    value,
    readAt,
  } satisfies CounterReading;
}

describe("missions", () => {
  it("counts what the counter gained since the start, main and rerolls added", () => {
    const scores = missionScores(MISSION, [
      reading("sira-main", "Sira", 100, at(5)),
      reading("sira-main", "Sira", 400, at(9)),
      reading("sira-reroll", "Sira", 10, at(4)),
      reading("sira-reroll", "Sira", 22, at(10)),
      // Thessa logged in during the mission only: her first reading is her start.
      reading("thessa", "Thessa", 50, at(7)),
      reading("thessa", "Thessa", 388, at(12)),
      // A reading after the end does not count.
      reading("thessa", "Thessa", 900, at(14)),
    ]);
    expect(scores.map(({ memberName, score }) => [memberName, score])).toEqual([
      ["Thessa", 338],
      ["Sira", 312],
    ]);
  });

  it("puts first, in a tie, the member who reached the score first; a counter that did not move scores nothing", () => {
    const scores = missionScores(MISSION, [
      reading("a", "Vorn", 0, at(5)),
      reading("a", "Vorn", 30, at(10)),
      reading("b", "Kaelys", 0, at(5)),
      reading("b", "Kaelys", 30, at(8)),
      reading("c", "Ulric", 12, at(5)),
      reading("c", "Ulric", 12, at(9)),
      reading("d", "Brann", 0, at(5, 1), "herbalism" as "fishing"),
    ]);
    expect(scores.map(({ memberName, score, reachedAt }) => [memberName, score, reachedAt])).toEqual([
      ["Kaelys", 30, at(8)],
      ["Vorn", 30, at(10)],
    ]);
  });

  it("shares the reward between the first three, 70 %, 20 % and 10 %, a missing place's share kept", () => {
    const score = (memberId: string): MissionScore => ({
      memberId,
      memberName: memberId,
      memberClass: undefined,
      score: 1,
      reachedAt: at(8),
    });
    expect(missionRewards([score("a"), score("b"), score("c"), score("d")], 2000)).toEqual([
      { memberId: "a", rank: 1, amount: 1400 },
      { memberId: "b", rank: 2, amount: 400 },
      { memberId: "c", rank: 3, amount: 200 },
    ]);
    expect(missionRewards([score("a")], 999)).toEqual([{ memberId: "a", rank: 1, amount: 699 }]);
  });

  it("keeps a hall of fame: wins, gold won and mean place where the member scored", () => {
    const score = (memberId: string): MissionScore => ({
      memberId,
      memberName: memberId,
      memberClass: undefined,
      score: 1,
      reachedAt: at(8),
    });
    const fame = hallOfFame([
      { scores: [score("Sira"), score("Vorn")], rewards: missionRewards([score("Sira"), score("Vorn")], 1000) },
      { scores: [score("Vorn"), score("Sira")], rewards: missionRewards([score("Vorn"), score("Sira")], 2000) },
      { scores: [score("Sira")], rewards: missionRewards([score("Sira")], 100) },
    ]);
    expect(
      fame.map(({ memberName, wins, gains, averagePosition }) => [memberName, wins, gains, averagePosition]),
    ).toEqual([
      ["Sira", 2, 700 + 400 + 70, 4 / 3],
      ["Vorn", 1, 200 + 1400, 1.5],
    ]);
  });

  it("publishes a mission with a type, a title, a reward and a span of up to a month, ending ahead", () => {
    const mission = { type: "fishing" as const, title: "Le Grand Pêcheur", reward: 2000, startsAt: START, endsAt: END };
    expect(newMissionRefusal(mission, at(5))).toBeUndefined();
    expect(newMissionRefusal({ ...mission, title: " " }, at(5))).toMatch(/titre/);
    expect(newMissionRefusal({ ...mission, reward: 0 }, at(5))).toMatch(/1 po au moins/);
    expect(newMissionRefusal({ ...mission, endsAt: START }, at(5))).toMatch(/jours/);
    expect(newMissionRefusal({ ...mission, endsAt: new Date("2026-12-31T00:00:00Z") }, at(5))).toMatch(/31 jours/);
    expect(newMissionRefusal(mission, at(14))).toMatch(/à venir/);
    expect(newMissionRefusal({ ...mission, type: "greyKills" as "fishing" }, at(5))).toMatch(/type/);
    expect(defaultEnd(START)).toEqual(END);
  });
});

describe("the quest's parchment", () => {
  it("writes what counts, with the elision before a vowel or a mute h", () => {
    expect(mostOf("pêches réussies")).toBe("le plus de pêches réussies");
    expect(mostOf("herbes cueillies")).toBe("le plus d'herbes cueillies");
    expect(missionPitch("herbalism")).toMatch(/^Qui fera le plus d'herbes cueillies d'ici la fin/);
  });

  it("tells a member how far they are from the podium, a tie going to the first to reach the score", () => {
    const scores = [412, 338, 251, 164, 90].map((score, index) => ({ memberId: `m${String(index + 1)}`, score }));
    expect(missionProgress(scores, "m5", "pêches réussies")).toEqual({
      place: 5,
      text: "Encore 162 pêches réussies pour monter sur le podium",
    });
    expect(missionProgress(scores, "m2", "pêches réussies")).toEqual({
      place: 2,
      text: "Sur le podium : encore 75 pêches réussies pour la 1re place",
    });
    expect(missionProgress(scores, "m1", "pêches réussies")).toEqual({
      place: 1,
      text: "En tête, avec 74 pêches réussies d'avance",
    });
    expect(missionProgress(scores, "nobody", "pêches réussies").place).toBeUndefined();
  });

  it("says how long ago a quest ended", () => {
    const now = new Date("2026-10-20T12:00:00Z");
    const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    expect([daysAgo(2), daysAgo(8), daysAgo(15), daysAgo(22)].map((endsAt) => endedAgo(endsAt, now))).toEqual([
      "Cette semaine",
      "Semaine dernière",
      "Il y a 2 semaines",
      "Il y a 3 semaines",
    ]);
  });
});
