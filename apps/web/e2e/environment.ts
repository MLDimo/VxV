import { tmpdir } from "node:os";
import { join } from "node:path";

/** Shared by the Playwright config, the database server and the tests. */
export const DATABASE_PORT = 54329;
export const WEB_PORT = 3200;
export const SESSIONS_FILE = join(tmpdir(), "vxv-e2e-sessions.json");

export const DISCORD_ROLES = { member: "10", treasurer: "11", officer: "12", gm: "13" } as const;

export const WEB_ENVIRONMENT = {
  DATABASE_URL: `postgresql://postgres@127.0.0.1:${DATABASE_PORT}/postgres`,
  DISCORD_CLIENT_ID: "1",
  DISCORD_CLIENT_SECRET: "e2e",
  DISCORD_GUILD_ID: "2",
  DISCORD_ROLE_MEMBER: DISCORD_ROLES.member,
  DISCORD_ROLE_TREASURER: DISCORD_ROLES.treasurer,
  DISCORD_ROLE_OFFICER: DISCORD_ROLES.officer,
  DISCORD_ROLE_GM: DISCORD_ROLES.gm,
};

export interface E2ESessions {
  officer: string;
  member: string;
  /** Reserved to the sign-out test, which ends it. */
  leavingMember: string;
}
