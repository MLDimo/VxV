import type { Repositories, UnitOfWork } from "../../application/ports.ts";
import type { SqlClient } from "../sql.ts";
import { characterRepository } from "./characters.ts";
import { eventRepository } from "./events.ts";
import { journalRepository } from "./journal.ts";
import { memberRepository } from "./members.ts";
import { raidRepository } from "./raids.ts";
import { sessionRepository } from "./sessions.ts";
import { signupRepository } from "./signups.ts";

function createRepositories(sql: SqlClient): Repositories {
  return {
    members: memberRepository(sql),
    sessions: sessionRepository(sql),
    characters: characterRepository(sql),
    journal: journalRepository(sql),
    raids: raidRepository(sql),
    events: eventRepository(sql),
    signups: signupRepository(sql),
  };
}

export function createUnitOfWork(sql: SqlClient): UnitOfWork {
  return { run: (work) => sql.transaction((transaction) => work(createRepositories(transaction))) };
}
