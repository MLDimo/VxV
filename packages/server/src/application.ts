import { createAuth } from "./application/auth.ts";
import { createCharacters } from "./application/characters.ts";
import { createEvents } from "./application/events.ts";
import { createExclusions } from "./application/exclusions.ts";
import { createJournal } from "./application/journal.ts";
import { createRoster } from "./application/roster.ts";
import { createSignups } from "./application/signups.ts";
import { createSoftReserves } from "./application/softReserves.ts";
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
    roster: createRoster({ unitOfWork }),
    characters: createCharacters({ unitOfWork }),
    events: createEvents({ unitOfWork, clock }),
    signups: createSignups({ unitOfWork, clock }),
    softReserves: createSoftReserves({ unitOfWork, clock }),
    exclusions: createExclusions({ unitOfWork }),
    journal: createJournal({ unitOfWork }),
  };
}

export type Application = ReturnType<typeof createApplication>;
