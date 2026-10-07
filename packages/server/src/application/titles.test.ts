import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Member } from "../domain/members.ts";
import { createFakeDiscord, type FakeDiscord } from "../infrastructure/discord/fakeDiscord.ts";
import { createDiscordGuild } from "../infrastructure/discord/guild.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { raidLogRepository } from "../infrastructure/postgres/raidLogs.ts";
import { raidRecordRepository } from "../infrastructure/postgres/raidRecords.ts";
import { journalRepository } from "../infrastructure/postgres/journal.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createEvent, createGuildCharacters, createMember, createRaidWithLoot } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createBets } from "./bets.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";
import { createCash } from "./cash.ts";
import type { AnnouncedTitles } from "./discordPorts.ts";
import { createTitles, titleRole, type Titles } from "./titles.ts";

const WEDNESDAY = new Date("2026-10-07T05:00:00Z");
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

describe("titles", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let discord: FakeDiscord;
  let titles: Titles;
  let announced: AnnouncedTitles[];
  let now: Date;
  let officer: Member;
  let vorn: Member;
  let morgane: Member;

  /** A member with their main character, as Discord knows them. */
  async function memberWithMain(name: string): Promise<Member> {
    const member = await createMember(sql, "member", name.split(" ")[0]);
    const [main] = await createGuildCharacters(sql, name);
    await characterRepository(sql).link(main.id, member.id);
    await characterRepository(sql).setMain(member.id, main.id);
    return member;
  }

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    discord = createFakeDiscord();
    vi.stubGlobal("fetch", discord.fetch);
    now = WEDNESDAY;
    announced = [];
    const unitOfWork = createUnitOfWork(sql);
    titles = createTitles({
      unitOfWork,
      clock: () => now,
      guild: createDiscordGuild({ token: "token", guildId: "guild" }),
      announcer: {
        announce: async (titlesOfWeek) => {
          announced.push(titlesOfWeek);
        },
      },
    });
    officer = await createMember(sql, "officer", "Officier");
    vorn = await memberWithMain("Vorn Cendrelune");
    morgane = await memberWithMain("Morgane Nuitsombre");

    // A bet Vorn won against Morgane, before the reassignment.
    const clock = () => new Date("2026-10-05T20:00:00Z");
    const bets = createBets({ unitOfWork, clock });
    const betId = await bets.create(
      officer,
      { title: "Qui meurt ?", choices: ["Oui", "Non"], closesAt: new Date("2026-10-06T20:00:00Z") },
      "Pari",
    );
    const [yes, no] = (await bets.find(betId))?.bet.choices ?? [];
    await bets.stake(vorn, betId, yes?.id ?? "", 100);
    await bets.stake(morgane, betId, no?.id ?? "", 150);
    await bets.declareResult(officer, betId, yes?.id ?? "", "Résultat");
    // A raid: Morgane received the head and healed most; Vorn died three times, raised twice, and hit hardest.
    await createRaidWithLoot(sql);
    const eventId = await createEvent(sql, officer, new Date("2026-10-04T20:00:00Z"), ["onyxia"]);
    const [morganeMain] = await characterRepository(sql).listByMember(morgane.id);
    await raidRecordRepository(sql).addLoots(eventId, [
      {
        encounterId: 2,
        itemId: 20,
        characterId: morganeMain?.id ?? "",
        method: "free_roll",
        lootedAt: new Date("2026-10-04T21:00:00Z"),
      },
    ]);
    await raidLogRepository(sql).save(
      eventId,
      [
        "VXV-LOG-2",
        `R;${eventId};1791144000;1791151200`,
        "D;Vorn Cendrelune;3",
        "M;Vorn Cendrelune;182000;0",
        "M;Morgane Nuitsombre;96000;240000",
        "A;Vorn Cendrelune;2",
      ].join("\n"),
      new Date("2026-10-04T23:00:00Z"),
    );
    // Vorn gives to the guild's cash.
    const treasurer = await createMember(sql, "treasurer", "Trésorier");
    await createCash({ unitOfWork, clock }).record(
      treasurer,
      { kind: "donation", amount: 500, label: "Don", memberId: vorn.id },
      "Don",
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await database.close();
  });

  it("gives the titles each Wednesday over the season, with their Discord roles and the announcement", async () => {
    expect(await titles.reassign()).toBe(true);
    const [week] = await titles.weeks();
    expect(week?.week).toBe("2026-10-07");
    expect(week?.holders.map(({ titleId, memberName, score }) => [titleId, memberName, score])).toEqual([
      ["debtKing", "Morgane Nuitsombre", 150],
      ["floorTaster", "Vorn Cendrelune", 3],
      ["gamblingKing", "Vorn Cendrelune", 125],
      ["mostRaised", "Vorn Cendrelune", 2],
      ["sugarDaddy", "Vorn Cendrelune", 500],
      ["topDamage", "Vorn Cendrelune", 182000],
      ["topHealing", "Morgane Nuitsombre", 240000],
      ["wellFed", "Morgane Nuitsombre", 1],
    ]);
    expect(discord.roleNamesOf(vorn.discordId).sort()).toEqual(
      ["Goûteur de sol", "Roi du gambling", "Lève toi copaing", "Sugar Daddy", "Chibrax au max"].map(titleRole).sort(),
    );
    expect(discord.roleNamesOf(morgane.discordId).sort()).toEqual(
      ["Bien gras", "Roi de la dette", "Remboursé par la Sécu"].map(titleRole).sort(),
    );
    expect(announced[0]?.holders.find((holder) => holder.title === "Numéro UNO")).toMatchObject({ holder: undefined });
    // Once a week only.
    now = new Date(WEDNESDAY.getTime() + 60 * 60 * 1000);
    expect(await titles.reassign()).toBe(false);
  });

  it("takes a title's role from its former holder the next week, and keeps the history", async () => {
    await titles.reassign();
    // Morgane gives more than Vorn: she becomes Sugar Daddy.
    const treasurer = await createMember(sql, "treasurer", "Trésorière");
    await createCash({ unitOfWork: createUnitOfWork(sql), clock: () => now }).record(
      treasurer,
      { kind: "donation", amount: 900, label: "Don", memberId: morgane.id },
      "Don",
    );
    now = new Date(WEDNESDAY.getTime() + WEEK_MS);
    expect(await titles.reassign()).toBe(true);
    expect(discord.roleNamesOf(vorn.discordId)).not.toContain(titleRole("Sugar Daddy"));
    expect(discord.roleNamesOf(morgane.discordId)).toContain(titleRole("Sugar Daddy"));
    expect((await titles.weeks()).map((week) => week.week)).toEqual(["2026-10-14", "2026-10-07"]);
  });

  it("lets an officer give Princesse for the week, with the role and the journal; nobody holds it the next week", async () => {
    await titles.reassign();
    await expect(titles.give(vorn, "princess", morgane.id, "Soins")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(titles.give(officer, "princess", morgane.id, " ")).rejects.toBeInstanceOf(ValidationError);
    await expect(titles.give(officer, "gamblingKing", morgane.id, "Soins")).rejects.toThrow(/se calcule/);
    await titles.give(officer, "princess", vorn.id, "Tous les soins du raid");
    await titles.give(officer, "princess", morgane.id, "Erreur : c'était Morgane");
    await expect(titles.give(officer, "princess", morgane.id, "Encore")).rejects.toThrow(/détient déjà/);
    const [week] = await titles.weeks();
    expect(week?.holders.find((holder) => holder.titleId === "princess")).toMatchObject({
      week: "2026-10-07",
      memberName: "Morgane Nuitsombre",
      score: undefined,
    });
    expect(discord.roleNamesOf(morgane.discordId)).toContain(titleRole("Princesse"));
    expect(discord.roleNamesOf(vorn.discordId)).not.toContain(titleRole("Princesse"));
    const [latest] = await journalRepository(sql).listRecent(1);
    expect(latest).toMatchObject({
      action: "title.give",
      before: { holder: "Vorn Cendrelune" },
      after: { title: "Princesse", week: "2026-10-07", holder: "Morgane Nuitsombre" },
      reason: "Erreur : c'était Morgane",
    });
    // Wednesday's reset: like the others, the title goes to nobody until an officer gives it again.
    now = new Date(WEDNESDAY.getTime() + WEEK_MS);
    await titles.reassign();
    const [next] = await titles.weeks();
    expect(next?.holders.map((holder) => holder.titleId)).not.toContain("princess");
    expect(discord.roleNamesOf(morgane.discordId)).not.toContain(titleRole("Princesse"));
  });
});
