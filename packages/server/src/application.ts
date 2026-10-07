import { createAddonBets } from "./application/addonBets.ts";
import { createAddonExport } from "./application/addonExport.ts";
import { createAddonArtisans } from "./application/addonArtisans.ts";
import { createArtisans } from "./application/artisans.ts";
import { createBossFights } from "./application/bossFights.ts";
import { createAddonDeathrolls } from "./application/addonDeathrolls.ts";
import { createDeathrolls } from "./application/deathrolls.ts";
import { createAddonMissions } from "./application/addonMissions.ts";
import { createAddonTitles } from "./application/addonTitles.ts";
import { createAuth } from "./application/auth.ts";
import { createBetAnnouncements } from "./application/betAnnouncements.ts";
import { createBets } from "./application/bets.ts";
import { createCash } from "./application/cash.ts";
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
import { createMissionAnnouncements } from "./application/missionAnnouncements.ts";
import { createMissions } from "./application/missions.ts";
import { createRaidLogs } from "./application/raidLogs.ts";
import { createRanking } from "./application/ranking.ts";
import { createRaidReminders } from "./application/raidReminders.ts";
import { createRoster } from "./application/roster.ts";
import { createSignups } from "./application/signups.ts";
import { createSoftReserves } from "./application/softReserves.ts";
import { createTitles } from "./application/titles.ts";
import { createTreasury } from "./application/treasury.ts";
import type {
  BetAnnouncer,
  DeathrollAnnouncer,
  GuildGateway,
  MissionAnnouncer,
  RaidAnnouncer,
  TitleAnnouncer,
} from "./application/discordPorts.ts";
import type { Clock } from "./application/ports.ts";
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
  /** The bets' channel, where each bet has its message. */
  betAnnouncer: BetAnnouncer;
  /** The missions' channel, where each mission has its message. */
  missionAnnouncer: MissionAnnouncer;
  /** Where each week's titles are announced. */
  titleAnnouncer: TitleAnnouncer;
  /** Where the deathrolls played for a big stake are announced. */
  deathrollAnnouncer: DeathrollAnnouncer;
  clock?: Clock;
}

/** Composition root shared by the website and the bot: every use case wired to PostgreSQL. */
export function createApplication({
  sql,
  discordRoles,
  guild,
  announcer,
  betAnnouncer,
  missionAnnouncer,
  titleAnnouncer,
  deathrollAnnouncer,
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
  const events = createEvents({ unitOfWork, clock });
  const missions = createMissions({ unitOfWork, clock });
  const missionAnnouncements = createMissionAnnouncements({ unitOfWork, announcer: missionAnnouncer, clock });
  const bets = createBets({ unitOfWork, clock });
  const betAnnouncements = createBetAnnouncements({ unitOfWork, announcer: betAnnouncer, clock });
  const gameChanges = createGameChanges({
    unitOfWork,
    clock,
    signups,
    softReserves,
    exclusions,
    events,
    announcements: raidAnnouncements,
    bets,
    betAnnouncements,
  });
  const titles = createTitles({ unitOfWork, clock, guild, announcer: titleAnnouncer });
  const artisans = createArtisans({ unitOfWork });
  const deathrolls = createDeathrolls({ unitOfWork, clock, announcer: deathrollAnnouncer });
  return {
    auth: createAuth({ unitOfWork, clock, discordRoles }),
    companion: createCompanion({ unitOfWork, clock, discordRoles, guild }),
    companionUploads: createCompanionUploads({
      roster,
      raidLogs,
      characters,
      gameChanges,
      missions,
      missionAnnouncements,
      artisans,
      deathrolls,
      bossFights: createBossFights({ unitOfWork, clock }),
    }),
    roster,
    characters,
    discordProfiles: createDiscordProfiles({ unitOfWork, guild }),
    raidAnnouncements,
    raidReminders: createRaidReminders({ unitOfWork, announcer }),
    events,
    signups,
    softReserves,
    exclusions,
    history: createHistory({ unitOfWork }),
    journal: createJournal({ unitOfWork }),
    addonExport: createAddonExport({ unitOfWork, clock }),
    raidLogs,
    bets,
    betAnnouncements,
    addonBets: createAddonBets({ unitOfWork, clock }),
    treasury: createTreasury({ unitOfWork, clock }),
    cash: createCash({ unitOfWork, clock }),
    ranking: createRanking({ unitOfWork, clock }),
    missions,
    missionAnnouncements,
    addonMissions: createAddonMissions({ unitOfWork, clock, missions }),
    titles,
    addonTitles: createAddonTitles({ unitOfWork, clock, titles }),
    artisans,
    addonArtisans: createAddonArtisans({ unitOfWork, clock }),
    deathrolls,
    addonDeathrolls: createAddonDeathrolls({ unitOfWork, clock }),
  };
}

export type Application = ReturnType<typeof createApplication>;
