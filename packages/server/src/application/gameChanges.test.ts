import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GameChange } from "../domain/gameChanges.ts";
import type { Member } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createEvent, createGuildCharacters, createMember, createRaidWithLoot } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createAddonExport } from "./addonExport.ts";
import { createEvents } from "./events.ts";
import { createExclusions } from "./exclusions.ts";
import { createGameChanges } from "./gameChanges.ts";
import { createSignups } from "./signups.ts";
import { createSoftReserves } from "./softReserves.ts";
import { createAddonBets } from "./addonBets.ts";
import { createBets } from "./bets.ts";

const NOW = new Date("2026-12-01T12:00:00Z");

describe("changes made in game", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let changes: ReturnType<typeof createGameChanges>;
  let signups: ReturnType<typeof createSignups>;
  let officer: Member;
  let member: Member;
  let eventId: string;
  let announced: string[];

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    const unitOfWork = createUnitOfWork(sql);
    const clock = () => NOW;
    announced = [];
    signups = createSignups({ unitOfWork, clock });
    changes = createGameChanges({
      unitOfWork,
      clock,
      events: createEvents({ unitOfWork, clock }),
      signups,
      softReserves: createSoftReserves({ unitOfWork, clock }),
      exclusions: createExclusions({ unitOfWork }),
      announcements: {
        announceQuietly: async (id) => {
          announced.push(id);
          return true;
        },
      },
      bets: createBets({ unitOfWork, clock }),
      betAnnouncements: {
        announceQuietly: async (id) => {
          announced.push(id);
          return true;
        },
      },
    });
    officer = await createMember(sql, "officer", "Officier");
    member = await createMember(sql, "member", "Membre");
    const [deja, thom] = await createGuildCharacters(sql, "Ðéjà Vu", "Thom Leboss");
    const characters = characterRepository(sql);
    await characters.link(deja.id, officer.id);
    await characters.link(thom.id, member.id);
    await createRaidWithLoot(sql);
    eventId = await createEvent(sql, officer, new Date("2026-12-10T20:00:00Z"), ["onyxia"]);
  });

  afterEach(async () => {
    await database.close();
  });

  const signup = (id: string, author = "Thom Leboss"): GameChange => ({
    id,
    eventId,
    author,
    kind: "signup",
    role: "healer",
    spec: "Sacré",
    status: "present",
  });

  it("signs up the author as on the website, and updates the event's message on Discord", async () => {
    expect(await changes.receive(member, [signup("Thom Leboss#1#1")])).toEqual([
      {
        id: "Thom Leboss#1#1",
        eventId,
        author: "Thom Leboss",
        accepted: true,
        message: "Inscription enregistrée sur le site.",
      },
    ]);
    expect((await signups.listForEvent(eventId)).map((entry) => [entry.characterName, entry.spec])).toEqual([
      ["Thom Leboss", "Sacré"],
    ]);
    expect(announced).toEqual([eventId]);
  });

  it("does a change once, whoever sends it again, and tells what became of it", async () => {
    await changes.receive(member, [signup("Thom Leboss#1#1")]);
    const reserves: GameChange = {
      id: "Thom Leboss#2#1",
      eventId,
      author: "Thom Leboss",
      kind: "reserves",
      itemIds: [20, 99],
    };
    const [refused] = await changes.receive(member, [reserves]);
    expect(refused).toMatchObject({
      accepted: false,
      message: "Un des objets choisis ne tombe pas dans les raids de cet événement.",
    });
    expect(await changes.receive(officer, [signup("Thom Leboss#1#1"), reserves])).toEqual([
      expect.objectContaining({ id: "Thom Leboss#1#1", accepted: true }),
      refused,
    ]);
    expect(announced).toHaveLength(1);
  });

  it("lets an officer relay a member's change, but not a member another's", async () => {
    expect(await changes.receive(officer, [signup("Thom Leboss#1#1")])).toEqual([
      expect.objectContaining({ accepted: true }),
    ]);
    const other = await createMember(sql, "member", "Autre");
    expect(await changes.receive(other, [signup("Thom Leboss#5#1")])).toEqual([]);
  });

  it("refuses the change of a character linked to nobody, and forgets one of an unknown event", async () => {
    const [stranger] = await changes.receive(officer, [signup("Inconnu#1#1", "Inconnu Total")]);
    expect(stranger).toMatchObject({ accepted: false, message: expect.stringContaining("lié à aucun membre") });
    const lost = { ...signup("Thom Leboss#9#9"), eventId: "00000000-0000-0000-0000-000000000000" };
    expect(await changes.receive(member, [lost])).toEqual([]);
  });

  it("excludes an item for an officer, with the reason in the journal; a member is refused", async () => {
    const exclusion = (id: string, author: string): GameChange => ({
      id,
      eventId,
      author,
      kind: "exclusion",
      itemId: 20,
      excluded: true,
      reason: "Pour le tank principal",
    });
    expect(await changes.receive(member, [exclusion("Thom Leboss#3#1", "Thom Leboss")])).toEqual([
      expect.objectContaining({ accepted: false, message: "Cette action est réservée aux officiers." }),
    ]);
    expect(await changes.receive(officer, [exclusion("Ðéjà Vu#3#1", "Ðéjà Vu")])).toEqual([
      expect.objectContaining({ accepted: true, message: "Objet exclu des SR." }),
    ]);
  });

  it("goes back to the game with the event's data", async () => {
    await changes.receive(member, [signup("Thom Leboss#1#1")]);
    const text = await createAddonExport({ unitOfWork: createUnitOfWork(sql), clock: () => NOW }).exportEvent(
      officer,
      eventId,
    );
    expect(text.split("\n")).toContain("C;Thom Leboss#1#1;1;Inscription enregistrée sur le site.");
  });

  describe("stakes made in game (P11.8)", () => {
    let betId: string;
    let tank: string;

    beforeEach(async () => {
      const bets = createBets({ unitOfWork: createUnitOfWork(sql), clock: () => NOW });
      betId = await bets.create(
        officer,
        {
          title: "Qui meurt en premier ?",
          choices: ["Un tank", "Un heal"],
          closesAt: new Date("2026-12-10T20:00:00Z"),
        },
        "Pari",
      );
      tank = (await bets.find(betId))?.bet.choices[0]?.id ?? "";
    });

    const stake = (id: string, amount = 50): GameChange => ({
      id,
      eventId: "",
      author: "Thom Leboss",
      kind: "stake",
      betId,
      choiceId: tank,
      amount,
    });

    it("stakes for the author, then takes the stake back, and refreshes the bet's message", async () => {
      expect(await changes.receive(officer, [stake("Thom Leboss#1#1")])).toEqual([
        {
          id: "Thom Leboss#1#1",
          eventId: undefined,
          betId,
          author: "Thom Leboss",
          accepted: true,
          message: "Mise de 50 po sur « Un tank » enregistrée : à payer au trésorier.".replace(/ po/u, "\u00a0po"),
        },
      ]);
      const [refused] = await changes.receive(member, [stake("Thom Leboss#2#1", 0)]);
      expect(refused).toMatchObject({ accepted: false, message: expect.stringMatching(/1 po au moins/u) });
      const withdraw: GameChange = {
        id: "Thom Leboss#3#1",
        eventId: "",
        author: "Thom Leboss",
        kind: "withdraw",
        betId,
      };
      expect(await changes.receive(member, [withdraw])).toEqual([
        expect.objectContaining({ accepted: true, message: "Mise retirée." }),
      ]);
      expect(announced).toEqual([betId, betId]);
    });

    it("answers with the bets' data, not the event's, and leaves aside a stake on an unknown bet", async () => {
      await changes.receive(member, [stake("Thom Leboss#1#1")]);
      const unitOfWork = createUnitOfWork(sql);
      const bets = await createAddonBets({ unitOfWork, clock: () => NOW }).exportBets();
      expect(bets.split("\n").filter((line) => line.startsWith("C;"))).toEqual([
        expect.stringMatching(/^C;Thom Leboss#1#1;1;Mise de 50/u),
      ]);
      const event = await createAddonExport({ unitOfWork, clock: () => NOW }).exportEvent(officer, eventId);
      expect(event).not.toContain("Thom Leboss#1#1");
      const lost = { ...stake("Thom Leboss#9#9"), betId: "00000000-0000-0000-0000-000000000000" };
      expect(await changes.receive(member, [lost])).toEqual([]);
    });
  });

  describe("events created in game (P9.2)", () => {
    const creation = (id: string, author: string, changes: Partial<Record<string, unknown>> = {}): GameChange =>
      ({
        id,
        eventId: "",
        author,
        kind: "event",
        date: "15/12",
        time: "21:00",
        raidIds: ["onyxia"],
        softReserves: 2,
        reason: "Raid du lundi",
        ...changes,
      }) as GameChange;

    it("creates the officer's event, publishes it on Discord, and tells the game with every event's data", async () => {
      const [outcome] = await changes.receive(officer, [creation("Ðéjà Vu#9#1", "Ðéjà Vu")]);
      expect(outcome).toEqual({
        id: "Ðéjà Vu#9#1",
        eventId: undefined,
        author: "Ðéjà Vu",
        accepted: true,
        message: "Événement du 15/12/2026 21:00 créé et annoncé sur Discord.",
      });
      const created = await sql.query<{ id: string; soft_reserves_per_player: number }>(
        "select id, soft_reserves_per_player from events where starts_at = '2026-12-15T20:00:00Z'",
      );
      expect(created[0]?.soft_reserves_per_player).toBe(2);
      expect(announced).toEqual([created[0]?.id]);
      const text = await createAddonExport({ unitOfWork: createUnitOfWork(sql), clock: () => NOW }).exportEvent(
        officer,
        eventId,
      );
      expect(text.split("\n")).toContain("C;Ðéjà Vu#9#1;1;Événement du 15/12/2026 21:00 créé et annoncé sur Discord.");
    });

    it("refuses a member, and a date the website cannot read", async () => {
      expect(await changes.receive(member, [creation("Thom Leboss#9#1", "Thom Leboss")])).toEqual([
        expect.objectContaining({ accepted: false, message: "Cette action est réservée aux officiers." }),
      ]);
      expect(await changes.receive(officer, [creation("Ðéjà Vu#9#2", "Ðéjà Vu", { date: "31/02" })])).toEqual([
        expect.objectContaining({ accepted: false, message: expect.stringContaining("15/10") }),
      ]);
    });
  });

  describe("conflicts with the website (P9.4)", () => {
    const minutes = (count: number) => new Date(NOW.getTime() + count * 60 * 1000);
    const reserves = (id: string, itemIds: number[], madeAt: Date): GameChange => ({
      id,
      eventId,
      author: "Thom Leboss",
      madeAt,
      kind: "reserves",
      itemIds,
    });

    it("does not apply a change made in game before the website's latest one", async () => {
      await changes.receive(member, [{ ...signup("Thom Leboss#1#1"), madeAt: minutes(-30) }]);
      const [thom] = await characterRepository(sql).listByMember(member.id);
      await signups.signUp(member, eventId, {
        characterId: thom?.id ?? "",
        role: "dps",
        spec: "Ombre",
        status: "late",
      });
      expect(await changes.receive(member, [{ ...signup("Thom Leboss#2#1"), madeAt: minutes(-10) }])).toEqual([
        expect.objectContaining({ accepted: false, message: expect.stringContaining("plus ancien") }),
      ]);
      expect((await signups.listForEvent(eventId))[0]?.spec).toBe("Ombre");
    });

    it("applies the changes made in game in the order they were made, whenever they arrive", async () => {
      await changes.receive(member, [{ ...signup("Thom Leboss#1#1"), madeAt: minutes(-30) }]);
      await changes.receive(member, [reserves("Thom Leboss#3#1", [21], minutes(-3))]);
      expect(await changes.receive(member, [reserves("Thom Leboss#2#1", [20], minutes(-4))])).toEqual([
        expect.objectContaining({ accepted: false }),
      ]);
      expect(await changes.receive(member, [reserves("Thom Leboss#4#1", [20], minutes(-2))])).toEqual([
        expect.objectContaining({ accepted: true }),
      ]);
    });
  });
});
