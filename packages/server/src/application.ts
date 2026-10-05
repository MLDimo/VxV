import { createAddonExport } from "./application/addonExport.ts";
import { createAuth } from "./application/auth.ts";
import { createCharacters } from "./application/characters.ts";
import { createCompanion } from "./application/companion.ts";
import { createDiscordProfiles } from "./application/discordProfiles.ts";
import { createEvents } from "./application/events.ts";
import { createExclusions } from "./application/exclusions.ts";
import { createHistory } from "./application/history.ts";
import { createJournal } from "./application/journal.ts";
import { createRaidAnnouncements } from "./application/raidAnnouncements.ts";
import { createRaidLogs } from "./application/raidLogs.ts";
import { createRaidReminders } from "./application/raidReminders.ts";
import { createRoster } from "./application/roster.ts";
import { createSignups } from "./application/signups.ts";
import { createSoftReserves } from "./application/softReserves.ts";
import type { Clock, GuildGateway, RaidAnnouncer } from "./application/ports.ts";
import type { DiscordRoleMapping } from "./domain/members.ts";
import { createUnitOfWork } from "./infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "./infrastructure/sql.ts";

export interface ApplicationConfig {
  sql: SqlClient;
  discordRoles: DiscordRoleMapping;
  /** The guild's Discord server, where the bot updates nicknames and roles. */
  guild: GuildGateway;
  /** The raid channel, where each event has its sign-up message. */
  announcer: RaidAnnouncer;
  clock?: Clock;
}

/** Composition root shared by the website and the bot: every use case wired to PostgreSQL. */
export function createApplication({
  sql,
  discordRoles,
  guild,
  announcer,
  clock = () => new Date(),
}: ApplicationConfig) {
  const unitOfWork = createUnitOfWork(sql);
  return {
    auth: createAuth({ unitOfWork, clock, discordRoles }),
    companion: createCompanion({ unitOfWork, clock, discordRoles, guild }),
    roster: createRoster({ unitOfWork }),
    characters: createCharacters({ unitOfWork }),
    discordProfiles: createDiscordProfiles({ unitOfWork, guild }),
    raidAnnouncements: createRaidAnnouncements({ unitOfWork, announcer }),
    raidReminders: createRaidReminders({ unitOfWork, announcer }),
    events: createEvents({ unitOfWork, clock }),
    signups: createSignups({ unitOfWork, clock }),
    softReserves: createSoftReserves({ unitOfWork, clock }),
    exclusions: createExclusions({ unitOfWork }),
    history: createHistory({ unitOfWork }),
    journal: createJournal({ unitOfWork }),
    addonExport: createAddonExport({ unitOfWork, clock }),
    raidLogs: createRaidLogs({ unitOfWork, announcer, clock }),
  };
}

export type Application = ReturnType<typeof createApplication>;
