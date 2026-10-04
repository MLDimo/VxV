import type { Repositories, UnitOfWork } from "../../application/ports.ts";
import type { SqlClient } from "../sql.ts";
import { bossLootRepository } from "./bossLoot.ts";
import { characterRepository } from "./characters.ts";
import { eventRepository } from "./events.ts";
import { exclusionRepository } from "./exclusions.ts";
import { journalRepository } from "./journal.ts";
import { lootHistoryRepository } from "./lootHistory.ts";
import { memberRepository } from "./members.ts";
import { raidRecordRepository } from "./raidRecords.ts";
import { raidRepository } from "./raids.ts";
import { sessionRepository } from "./sessions.ts";
import { signupRepository } from "./signups.ts";
import { softReserveRepository } from "./softReserves.ts";

function createRepositories(sql: SqlClient): Repositories {
  return {
    members: memberRepository(sql),
    sessions: sessionRepository(sql),
    characters: characterRepository(sql),
    journal: journalRepository(sql),
    raids: raidRepository(sql),
    events: eventRepository(sql),
    signups: signupRepository(sql),
    bossLoot: bossLootRepository(sql),
    lootHistory: lootHistoryRepository(sql),
    softReserves: softReserveRepository(sql),
    exclusions: exclusionRepository(sql),
    raidRecords: raidRecordRepository(sql),
  };
}

export function createUnitOfWork(sql: SqlClient): UnitOfWork {
  return { run: (work) => sql.transaction((transaction) => work(createRepositories(transaction))) };
}
