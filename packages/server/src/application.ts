import { createAuth } from "./application/auth.ts";
import type { Clock } from "./application/ports.ts";
import type { DiscordRoleMapping } from "./domain/members.ts";
import { createUnitOfWork } from "./infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "./infrastructure/sql.ts";

export interface ApplicationConfig {
  sql: SqlClient;
  discordRoles: DiscordRoleMapping;
  clock?: Clock;
}

/** Composition root shared by the website and the bot: every use case wired to PostgreSQL. */
export function createApplication({ sql, discordRoles, clock = () => new Date() }: ApplicationConfig) {
  const unitOfWork = createUnitOfWork(sql);
  return {
    auth: createAuth({ unitOfWork, clock, discordRoles }),
  };
}

export type Application = ReturnType<typeof createApplication>;
