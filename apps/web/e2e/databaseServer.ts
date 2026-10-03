import { writeFile } from "node:fs/promises";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { createMigratedPGlite } from "@vxv/database/testing";
import { createApplication } from "@vxv/server";
import { sqlClientFromPGlite } from "@vxv/server/testing";
import { DATABASE_PORT, DISCORD_ROLES, SESSIONS_FILE, type E2ESessions } from "./environment";

/**
 * PostgreSQL for the end-to-end tests: a migrated PGlite reachable over the network, with an officer and a
 * member signed in through the real use case. Their session tokens are written for the tests to use.
 */
const MAX_CONNECTIONS = 10;

const database = await createMigratedPGlite();
const { auth } = createApplication({ sql: sqlClientFromPGlite(database), discordRoles: DISCORD_ROLES });
const officer = await auth.signIn({ discordId: "100", discordName: "Officier Test" }, [DISCORD_ROLES.officer]);
const member = await auth.signIn({ discordId: "200", discordName: "Membre Test" }, [DISCORD_ROLES.member]);
const leavingMember = await auth.signIn({ discordId: "300", discordName: "Membre Sortant" }, [DISCORD_ROLES.member]);
const sessions: E2ESessions = { officer: officer.token, member: member.token, leavingMember: leavingMember.token };
await writeFile(SESSIONS_FILE, JSON.stringify(sessions));

const server = new PGLiteSocketServer({
  db: database,
  host: "127.0.0.1",
  port: DATABASE_PORT,
  maxConnections: MAX_CONNECTIONS,
});
await server.start();
