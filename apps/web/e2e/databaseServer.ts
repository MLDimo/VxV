import { writeFile } from "node:fs/promises";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { renderSeedSql } from "@vxv/data-generator/seedSql";
import { createMigratedPGlite } from "@vxv/database/testing";
import { loadRaids } from "@vxv/raid-data";
import { createApplication } from "@vxv/server";
import { sqlClientFromPGlite } from "@vxv/server/testing";
import { DATABASE_PORT, DISCORD_ROLES, SEED_ROSTER, SESSIONS_FILE, type E2ESessions } from "./environment";

/**
 * PostgreSQL for the end-to-end tests: a migrated PGlite reachable over the network, holding the real raid data,
 * with an officer and members signed in through the real use case. Their session tokens are written for the tests to use.
 */
const MAX_CONNECTIONS = 10;

const database = await createMigratedPGlite();
await database.exec(renderSeedSql(await loadRaids()).content);
const { auth, roster } = createApplication({ sql: sqlClientFromPGlite(database), discordRoles: DISCORD_ROLES });
const officer = await auth.signIn({ discordId: "100", discordName: "Officier Test" }, [DISCORD_ROLES.officer]);
const member = await auth.signIn({ discordId: "200", discordName: "Membre Test" }, [DISCORD_ROLES.member]);
const leavingMember = await auth.signIn({ discordId: "300", discordName: "Membre Sortant" }, [DISCORD_ROLES.member]);
await roster.importRoster(officer.member, ["VXV-ROSTER-1", ...SEED_ROSTER].join("\n"), "Liste de départ des tests");
const sessions: E2ESessions = { officer: officer.token, member: member.token, leavingMember: leavingMember.token };
await writeFile(SESSIONS_FILE, JSON.stringify(sessions));

const server = new PGLiteSocketServer({
  db: database,
  host: "127.0.0.1",
  port: DATABASE_PORT,
  maxConnections: MAX_CONNECTIONS,
});
await server.start();
