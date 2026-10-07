import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestSigner } from "@vxv/bot/testing";

/** Shared by the Playwright config, the database server and the tests. */
export const DATABASE_PORT = 54329;
/** Stands for Discord's REST API, which the bot calls. */
export const FAKE_DISCORD_PORT = 54330;
export const FAKE_DISCORD_URL = `http://127.0.0.1:${FAKE_DISCORD_PORT}`;
export const WEB_PORT = 3200;
export const SEED_FILE = join(tmpdir(), "vxv-e2e-seed.json");

export const DISCORD_ROLES = { treasurer: "11", officer: "12", gm: "13" } as const;
/** A role of the guild's Discord server an event may be reserved to. */
export const RAIDER_ROLE = "Raideur R1";

/** Stands for the Discord application: signs the interactions sent to the website. */
export const DISCORD = createTestSigner(Buffer.alloc(32, 7));

export const WEB_ENVIRONMENT = {
  DATABASE_URL: `postgresql://postgres@127.0.0.1:${DATABASE_PORT}/postgres`,
  SITE_URL: `http://localhost:${WEB_PORT}`,
  CRON_SECRET: "e2e-cron-secret-e2e-cron-secret-e2e",
  DISCORD_CLIENT_ID: "1",
  DISCORD_CLIENT_SECRET: "e2e",
  DISCORD_PUBLIC_KEY: DISCORD.publicKeyHex,
  DISCORD_BOT_TOKEN: "e2e",
  DISCORD_API_URL: `${FAKE_DISCORD_URL}/api/v10`,
  DISCORD_GUILD_ID: "2",
  DISCORD_LINK_CHANNEL_ID: "20",
  DISCORD_RAID_CHANNEL_ID: "21",
  DISCORD_BETS_CHANNEL_ID: "22",
  DISCORD_MISSIONS_CHANNEL_ID: "23",
  DISCORD_TITLES_CHANNEL_ID: "24",
  DISCORD_ROLE_TREASURER: DISCORD_ROLES.treasurer,
  DISCORD_ROLE_OFFICER: DISCORD_ROLES.officer,
  DISCORD_ROLE_GM: DISCORD_ROLES.gm,
};

/** Guild characters imported before the tests (accents included, as in the game). */
export const SEED_ROSTER = [
  "Aubé;Clairval;PRIEST",
  "Brume;Noire;MAGE",
  "Ciel;Gris;WARRIOR",
  "Dune;Sable;HUNTER",
  "Éole;Vent;DRUID",
];

/** Session tokens of the prepared members. */
export interface E2ESessions {
  /** Officer, whose main is Ciel Gris. */
  officer: string;
  member: string;
  /** Member without any character. */
  newcomer: string;
  /** Reserved to the sign-out test, which ends it. */
  leavingMember: string;
  /** Member whose main is Dune Sable, signed up to the locked event. */
  lockedMember: string;
  /** Member who links Éole Vent through the bot (Discord user 600). */
  discordMember: string;
}

/** What the database server prepared, written for the tests to read. */
export interface E2ESeed {
  sessions: E2ESessions;
  /** Event on La salle des Thanes, reserved to the sign-up tests. */
  signupEventId: string;
  /** Event on La salle des Thanes reserved to the raiders' role (RAIDER_ROLE), which only the officer holds. */
  reservedEventId: string;
  /** The raiders' role on the fake Discord server. */
  raiderRoleId: string;
  /** Event on La salle des Thanes where the officer (Ciel Gris) is already signed up, for the soft reserve tests. */
  softReserveEventId: string;
  /** Event starting 10 minutes after the seed: its soft reserves are locked. */
  lockedEventId: string;
  /** Event with recorded loots, for the history tests. */
  historyEventId: string;
  /** Event where Dune Sable reserves an item missed at an earlier raid: SR+ +10. */
  bonusEventId: string;
  /** Event without sign-ups, whose raid log the tests import. */
  raidLogEventId: string;
  /** Event without sign-ups, whose raid log an officer's companion sends. */
  companionEventId: string;
  /** A mission over a few seconds after the seed, Ciel Gris ahead: for the validation and the rewards. */
  endedMissionId: string;
}
