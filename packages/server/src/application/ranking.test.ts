import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Member } from "../domain/members.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { titleRepository } from "../infrastructure/postgres/titles.ts";
import { createGuildCharacters, createMember } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createBets, type Bets } from "./bets.ts";
import { ForbiddenError } from "./errors.ts";
import { createJournal } from "./journal.ts";
import { createRanking } from "./ranking.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("ranking", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let bets: Bets;
  let ranking: ReturnType<typeof createRanking>;
  let journal: ReturnType<typeof createJournal>;
  let now: Date;
  let officer: Member;
  let vorn: Member;
  let thessa: Member;

  /** A bet Vorn wins with 100 po against Thessa's 100, ended now. */
  async function playOne(title: string) {
    const betId = await bets.create(
      officer,
      { title, choices: ["Oui", "Non"], closesAt: new Date(now.getTime() + DAY_MS) },
      "Pari",
    );
    const choices = (await bets.find(betId))?.bet.choices ?? [];
    await bets.stake(vorn, betId, choices[0]?.id ?? "", 100);
    await bets.stake(thessa, betId, choices[1]?.id ?? "", 100);
    await bets.declareResult(officer, betId, choices[0]?.id ?? "", "Résultat");
    // Thessa pays what she lost: no debt keeps her from the next bets.
    await sql.query("update stakes set paid_at = $1, paid_by = $2 where paid_at is null", [now, officer.id]);
  }

  beforeEach(async () => {
    const test = await createTestDatabase();
    database = test.database;
    now = new Date("2026-09-20T20:00:00Z");
    const unitOfWork = createUnitOfWork(test.sql);
    bets = createBets({ unitOfWork, clock: () => now });
    ranking = createRanking({ unitOfWork, clock: () => now });
    journal = createJournal({ unitOfWork });
    officer = await createMember(test.sql, "officer", "Officier");
    vorn = await createMember(test.sql, "member", "Vorn");
    thessa = await createMember(test.sql, "member", "Thessa");
    sql = test.sql;
  });

  afterEach(async () => {
    await database.close();
  });

  it("ranks the bettors since always, this month, and this season once an officer started it", async () => {
    await playOne("Septembre");
    now = new Date("2026-10-06T20:00:00Z");
    await playOne("Octobre");
    const names = async (period: "always" | "month" | "season") =>
      (await ranking.board("paris", period)).lines.map(({ name, value }) => [name, value]);
    expect(await names("always")).toEqual([
      ["Vorn", 160],
      ["Thessa", -200],
    ]);
    expect(await names("month")).toEqual([
      ["Vorn", 80],
      ["Thessa", -100],
    ]);
    // Without a season, the season's ranking is empty until an officer starts one.
    expect(await names("season")).toEqual([]);
    await expect(ranking.startSeason(vorn, "Saison 1")).rejects.toBeInstanceOf(ForbiddenError);
    now = new Date("2026-10-07T10:00:00Z");
    const season = await ranking.startSeason(officer, "Lancement des classements");
    expect(season.number).toBe(1);
    now = new Date("2026-10-07T20:00:00Z");
    await playOne("Saison 1");
    expect(await names("season")).toEqual([
      ["Vorn", 80],
      ["Thessa", -100],
    ]);
    expect((await ranking.startSeason(officer, "Saison suivante")).number).toBe(2);
    expect((await journal.listRecent())[0]).toMatchObject({ action: "season.start", after: { number: 2 } });
  });

  it("shows each member of a board by their main character, with their title of the week, and the records", async () => {
    await playOne("Septembre");
    const [main] = await createGuildCharacters(sql, "Vorn Cendrelune");
    await characterRepository(sql).link(main?.id ?? "", vorn.id);
    await characterRepository(sql).setMain(vorn.id, main?.id ?? "");
    await characterRepository(sql).setAppearance(main?.id ?? "", { race: "Orc", sex: "male" });
    await titleRepository(sql).saveWeek("2026-09-16", [{ titleId: "gamblingKing", memberId: vorn.id, score: 80 }], now);
    const board = await ranking.board("paris", "always");
    expect(board).toMatchObject({ category: "paris", metric: "gain net", unit: "gold" });
    expect(board.lines[0]).toMatchObject({
      rank: 1,
      name: "Vorn Cendrelune",
      characterClass: "ROGUE",
      race: "Orc",
      sex: "male",
      value: 80,
      title: "Roi du gambling",
    });
    expect(board.records.map(({ label, member }) => [label, member.name])).toEqual([
      ["Plus gros gain", "Vorn Cendrelune"],
      ["Plus grosse perte", "Thessa"],
      ["Paris joués", "Thessa"],
    ]);
    const titles = await ranking.board("titres", "always");
    expect(titles.lines.map(({ name, value }) => [name, value])).toEqual([["Vorn Cendrelune", 1]]);
  });
});
