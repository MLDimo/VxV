import { createAddonExport } from "./application/addonExport.ts";
import { createAuth } from "./application/auth.ts";
import { createCharacters } from "./application/characters.ts";
import { createCompanion } from "./application/companion.ts";
import { createCompanionUploads } from "./application/companionUploads.ts";
import { createDiscordProfiles } from "./application/discordProfiles.ts";
import { createEvents } from "./application/events.ts";
import { createExclusions } from "./application/exclusions.ts";
import { createGameChanges } from "./application/gameChanges.ts";
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
  const roster = createRoster({ unitOfWork });
  const characters = createCharacters({ unitOfWork });
  const raidLogs = createRaidLogs({ unitOfWork, announcer, clock });
  const signups = createSignups({ unitOfWork, clock });
  const softReserves = createSoftReserves({ unitOfWork, clock });
  const exclusions = createExclusions({ unitOfWork });
  const raidAnnouncements = createRaidAnnouncements({ unitOfWork, announcer });
  const gameChanges = createGameChanges({
    unitOfWork,
    signups,
    softReserves,
    exclusions,
    announcements: raidAnnouncements,
  });
  return {
    auth: createAuth({ unitOfWork, clock, discordRoles }),
    companion: createCompanion({ unitOfWork, clock, discordRoles, guild }),
    companionUploads: createCompanionUploads({ roster, raidLogs, characters, gameChanges }),
    roster,
    characters,
    discordProfiles: createDiscordProfiles({ unitOfWork, guild }),
    raidAnnouncements,
    raidReminders: createRaidReminders({ unitOfWork, announcer }),
    events: createEvents({ unitOfWork, clock }),
    signups,
    softReserves,
    exclusions,
    history: createHistory({ unitOfWork }),
    journal: createJournal({ unitOfWork }),
    addonExport: createAddonExport({ unitOfWork, clock }),
    raidLogs,
  };
}

export type Application = ReturnType<typeof createApplication>;
