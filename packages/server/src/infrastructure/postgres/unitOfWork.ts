import type { Repositories, UnitOfWork } from "../../application/ports.ts";
import type { SqlClient } from "../sql.ts";
import { memberRepository } from "./members.ts";
import { sessionRepository } from "./sessions.ts";

function createRepositories(sql: SqlClient): Repositories {
  return { members: memberRepository(sql), sessions: sessionRepository(sql) };
}

export function createUnitOfWork(sql: SqlClient): UnitOfWork {
  return { run: (work) => sql.transaction((transaction) => work(createRepositories(transaction))) };
}
