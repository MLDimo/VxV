import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Member } from "../domain/members.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createMember } from "../test/fixtures.ts";
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
      (await ranking.bettors(period)).bettors.map(({ memberName, net, bets: played }) => [memberName, net, played]);
    expect(await names("always")).toEqual([
      ["Vorn", 160, 2],
      ["Thessa", -200, 2],
    ]);
    expect(await names("month")).toEqual([
      ["Vorn", 80, 1],
      ["Thessa", -100, 1],
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
      ["Vorn", 80, 1],
      ["Thessa", -100, 1],
    ]);
    expect((await ranking.startSeason(officer, "Saison suivante")).number).toBe(2);
    expect((await journal.listRecent())[0]).toMatchObject({ action: "season.start", after: { number: 2 } });
  });
});
