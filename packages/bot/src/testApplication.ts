import type { PGliteInterface } from "@electric-sql/pglite";
import { createApplication, createDiscordGuild, type Application, type DiscordRoleMapping } from "@vxv/server";
import { createFakeDiscord, createTestDatabase, type FakeDiscord } from "@vxv/server/testing";
import { vi } from "vitest";

export const TEST_ROLES: DiscordRoleMapping = { treasurer: "treasurer-role", officer: "officer-role", gm: "gm-role" };

/** Discord user who owns the test server: no bot may rename them. */
export const SERVER_OWNER = "owner";

/**
 * The real use cases on a fresh migrated database, with guild characters imported by an officer,
 * and a fake Discord server in place of fetch (vi.unstubAllGlobals after each test).
 */
export async function createTestApplication(
  roster: readonly string[],
): Promise<{ app: Application; database: PGliteInterface; discord: FakeDiscord }> {
  const { database, sql } = await createTestDatabase();
  const discord = createFakeDiscord({ ownerId: SERVER_OWNER });
  vi.stubGlobal("fetch", discord.fetch);
  const guild = createDiscordGuild({ token: "token", guildId: "guild" });
  const app = createApplication({ sql, discordRoles: TEST_ROLES, guild });
  const officer = await app.auth.identify({ discordId: "officer", discordName: "Officier" }, [TEST_ROLES.officer]);
  await app.roster.importRoster(officer, ["VXV-ROSTER-1", ...roster].join("\n"), "Liste de guilde des tests");
  return { app, database, discord };
}
