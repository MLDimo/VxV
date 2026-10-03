import type { PGliteInterface } from "@electric-sql/pglite";
import { createApplication, type Application, type DiscordRoleMapping } from "@vxv/server";
import { createTestDatabase } from "@vxv/server/testing";

export const TEST_ROLES: DiscordRoleMapping = { treasurer: "treasurer-role", officer: "officer-role", gm: "gm-role" };

/** The real use cases on a fresh migrated database, with guild characters imported by an officer. */
export async function createTestApplication(
  roster: readonly string[],
): Promise<{ app: Application; database: PGliteInterface }> {
  const { database, sql } = await createTestDatabase();
  const app = createApplication({ sql, discordRoles: TEST_ROLES });
  const officer = await app.auth.identify({ discordId: "officer", discordName: "Officier" }, [TEST_ROLES.officer]);
  await app.roster.importRoster(officer, ["VXV-ROSTER-1", ...roster].join("\n"), "Liste de guilde des tests");
  return { app, database };
}
