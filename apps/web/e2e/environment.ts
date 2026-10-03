import { tmpdir } from "node:os";
import { join } from "node:path";

/** Shared by the Playwright config, the database server and the tests. */
export const DATABASE_PORT = 54329;
export const WEB_PORT = 3200;
export const SEED_FILE = join(tmpdir(), "vxv-e2e-seed.json");

export const DISCORD_ROLES = { treasurer: "11", officer: "12", gm: "13" } as const;

export const WEB_ENVIRONMENT = {
  DATABASE_URL: `postgresql://postgres@127.0.0.1:${DATABASE_PORT}/postgres`,
  DISCORD_CLIENT_ID: "1",
  DISCORD_CLIENT_SECRET: "e2e",
  DISCORD_GUILD_ID: "2",
  DISCORD_ROLE_TREASURER: DISCORD_ROLES.treasurer,
  DISCORD_ROLE_OFFICER: DISCORD_ROLES.officer,
  DISCORD_ROLE_GM: DISCORD_ROLES.gm,
};

/** Guild characters imported before the tests (accents included, as in the game). */
export const SEED_ROSTER = ["Aubé;Clairval;PRIEST", "Brume;Noire;MAGE", "Ciel;Gris;WARRIOR", "Dune;Sable;HUNTER"];

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
}

/** What the database server prepared, written for the tests to read. */
export interface E2ESeed {
  sessions: E2ESessions;
  /** Event on La salle des Thanes, reserved to the sign-up tests. */
  signupEventId: string;
  /** Event on La salle des Thanes where the officer (Ciel Gris) is already signed up, for the soft reserve tests. */
  softReserveEventId: string;
  /** Event starting 10 minutes after the seed: its soft reserves are locked. */
  lockedEventId: string;
  /** Event with recorded loots, for the history tests. */
  historyEventId: string;
  /** Event where Dune Sable reserves an item missed at an earlier raid: SR+ +10. */
  bonusEventId: string;
}
