import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Member } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import { createGuildCharacters, createMember } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createCash } from "./cash.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";
import { createJournal } from "./journal.ts";
import { createMissions, type Missions } from "./missions.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const START = new Date("2026-10-06T18:00:00Z");

describe("missions", () => {
  let database: PGliteInterface;
  let missions: Missions;
  let journal: ReturnType<typeof createJournal>;
  let cash: ReturnType<typeof createCash>;
  let now: Date;
  let officer: Member;
  let treasurer: Member;
  let sira: Member;
  let thessa: Member;

  const day = (days: number) => new Date(START.getTime() + days * DAY_MS);
  const publish = () =>
    missions.create(
      officer,
      { type: "fishing", title: "Le Grand Pêcheur", reward: 2000, startsAt: START, endsAt: day(7) },
      "Mission de la semaine",
    );

  beforeEach(async () => {
    const test = await createTestDatabase();
    database = test.database;
    now = new Date("2026-10-06T17:00:00Z");
    const unitOfWork = createUnitOfWork(test.sql);
    missions = createMissions({ unitOfWork, clock: () => now });
    journal = createJournal({ unitOfWork });
    cash = createCash({ unitOfWork, clock: () => now });
    officer = await createMember(test.sql, "officer", "Officier");
    treasurer = await createMember(test.sql, "treasurer", "Trésorier");
    sira = await createMember(test.sql, "member", "Sira");
    thessa = await createMember(test.sql, "member", "Thessa");
    const [siraMain, siraReroll, thessaMain] = await createGuildCharacters(
      test.sql,
      "Sira Ventargent",
      "Sirette Ventargent",
      "Thessa Feuillevent",
    );
    const characters = characterRepository(test.sql);
    await characters.link(siraMain.id, sira.id);
    await characters.setMain(sira.id, siraMain.id);
    await characters.link(siraReroll.id, sira.id);
    await characters.link(thessaMain.id, thessa.id);
    await characters.setMain(thessa.id, thessaMain.id);
  });

  afterEach(async () => {
    await database.close();
  });

  it("lets an officer publish a mission, recorded in the journal; a member cannot", async () => {
    const missionId = await publish();
    const found = await missions.find(missionId);
    expect(found).toMatchObject({ status: "upcoming", scores: [], mission: { title: "Le Grand Pêcheur" } });
    expect((await journal.listRecent())[0]).toMatchObject({
      action: "mission.create",
      reason: "Mission de la semaine",
    });
    await expect(
      missions.create(sira, { type: "fishing", title: "X", reward: 1, startsAt: START, endsAt: day(7) }, "M"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("scores the readings the companions send: own characters, and an officer's relays", async () => {
    const missionId = await publish();
    const reading = (name: string, value: number, at: Date) => ({ name, type: "fishing", value, at });
    expect(
      await missions.recordReadings(sira, [
        reading("Sira Ventargent", 100, day(-1)),
        reading("Sira Ventargent", 400, day(3)),
        reading("Sirette Ventargent", 10, day(1)),
        reading("Sirette Ventargent", 22, day(4)),
        // Not hers: left aside.
        reading("Thessa Feuillevent", 999, day(2)),
        reading("Inconnu Total", 5, day(2)),
        { name: "Sira Ventargent", type: "greyKills", value: 3, at: day(2) },
      ]),
    ).toBe(4);
    expect(await missions.recordReadings(sira, [reading("Sira Ventargent", 400, day(3))])).toBe(0);
    expect(
      await missions.recordReadings(officer, [
        reading("Thessa Feuillevent", 50, day(1)),
        reading("Thessa Feuillevent", 388, day(5)),
      ]),
    ).toBe(2);
    now = day(2);
    const running = await missions.find(missionId);
    expect(running?.status).toBe("running");
    expect(running?.scores.map(({ memberName, score }) => [memberName, score])).toEqual([
      ["Thessa Feuillevent", 338],
      ["Sira Ventargent", 312],
    ]);
  });

  it("validates the result once the mission is over, the treasurer then hands the rewards over from the cash", async () => {
    const missionId = await publish();
    await missions.recordReadings(officer, [
      { name: "Sira Ventargent", type: "fishing", value: 0, at: day(1) },
      { name: "Sira Ventargent", type: "fishing", value: 40, at: day(2) },
      { name: "Thessa Feuillevent", type: "fishing", value: 0, at: day(1) },
      { name: "Thessa Feuillevent", type: "fishing", value: 12, at: day(2) },
    ]);
    now = day(3);
    await expect(missions.close(officer, missionId, "Résultat")).rejects.toThrow(/pas finie/);
    now = day(8);
    await expect(missions.close(sira, missionId, "Résultat")).rejects.toBeInstanceOf(ForbiddenError);
    await missions.close(officer, missionId, "Classement vérifié");
    const closed = await missions.find(missionId);
    expect(closed?.status).toBe("closed");
    expect(closed?.rewards.map(({ rank, memberName, amount }) => [rank, memberName, amount])).toEqual([
      [1, "Sira Ventargent", 1400],
      [2, "Thessa Feuillevent", 400],
    ]);
    expect((await journal.listRecent())[0]).toMatchObject({ action: "mission.close", reason: "Classement vérifié" });
    await expect(missions.close(officer, missionId, "Encore")).rejects.toThrow(/déjà validé/);

    await expect(missions.markRewardPaid(officer, missionId, 1)).rejects.toThrow(/réservée au trésorier/);
    await missions.markRewardPaid(treasurer, missionId, 1);
    await expect(missions.markRewardPaid(treasurer, missionId, 1)).rejects.toThrow(/déjà versée/);
    await expect(missions.markRewardPaid(treasurer, missionId, 3)).rejects.toBeInstanceOf(ValidationError);
    const { balance, movements } = await cash.overview();
    expect(balance).toBe(-1400);
    expect(movements[0]).toMatchObject({
      kind: "reward",
      label: expect.stringContaining("récompense du 1er (Sira Ventargent)"),
    });
    expect((await missions.hallOfFame()).map(({ memberName, wins, gains }) => [memberName, wins, gains])).toEqual([
      ["Sira Ventargent", 1, 1400],
      ["Thessa Feuillevent", 0, 400],
    ]);
  });
});
