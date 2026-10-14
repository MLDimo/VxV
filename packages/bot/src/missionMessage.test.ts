import type { AnnouncedMission } from "@vxv/server";
import { describe, expect, it } from "vitest";
import { missionResultsMessage } from "./missionMessage.ts";

/** French typography keeps numbers and units together with no-break spaces. */
const plain = (text: string | undefined) => text?.replace(/[\u00a0\u202f]/gu, " ");

const score = (memberId: string, memberName: string, value: number) => ({
  memberId,
  memberName,
  memberClass: undefined,
  score: value,
  reachedAt: new Date("2026-10-12T20:00:00Z"),
});

const CLOSED: AnnouncedMission = {
  mission: {
    id: "m1",
    type: "fishing",
    title: "Le Grand Pêcheur",
    reward: 1000,
    startsAt: new Date("2026-10-07T18:00:00Z"),
    endsAt: new Date("2026-10-14T18:00:00Z"),
    createdAt: new Date("2026-10-07T17:00:00Z"),
    closedAt: new Date("2026-10-14T19:00:00Z"),
    discordMessage: undefined,
  },
  status: "closed",
  scores: [score("a", "Sira Ventargent", 120), score("b", "Thom Leboss", 80)],
};

describe("missionResultsMessage", () => {
  it("publishes the podium of a validated quest with each reward, linked to its page", () => {
    const [embed] = missionResultsMessage(CLOSED, "https://vxv.test").embeds ?? [];
    expect(embed?.title).toBe("🏆 Résultats · Le Grand Pêcheur");
    expect(embed?.url).toBe("https://vxv.test/quetes/m1");
    expect(plain(embed?.fields?.[0]?.value)).toBe(
      "1er Sira Ventargent — 120 pêches réussies · 700 po\n2e Thom Leboss — 80 pêches réussies · 200 po",
    );
  });

  it("says so when nobody took part", () => {
    const [embed] = missionResultsMessage({ ...CLOSED, scores: [] }, "https://vxv.test").embeds ?? [];
    expect(embed?.fields?.[0]?.value).toBe("Personne n'a participé.");
  });
});
