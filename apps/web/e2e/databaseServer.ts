import { writeFile } from "node:fs/promises";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { renderSeedSql } from "@vxv/data-generator/seedSql";
import { createMigratedPGlite } from "@vxv/database/testing";
import { loadRaids } from "@vxv/raid-data";
import { createApplication } from "@vxv/server";
import { sqlClientFromPGlite } from "@vxv/server/testing";
import { DATABASE_PORT, DISCORD_ROLES, SEED_FILE, SEED_ROSTER, type E2ESeed } from "./environment";

/**
 * PostgreSQL for the end-to-end tests: a migrated PGlite reachable over the network, holding the real raid data.
 * Everything else is prepared through the real use cases, then described in the seed file for the tests.
 */
const MAX_CONNECTIONS = 10;

const database = await createMigratedPGlite();
await database.exec(renderSeedSql(await loadRaids()).content);
const app = createApplication({ sql: sqlClientFromPGlite(database), discordRoles: DISCORD_ROLES });

const signIn = (discordId: string, discordName: string, role: keyof typeof DISCORD_ROLES) =>
  app.auth.signIn({ discordId, discordName }, [DISCORD_ROLES[role]]);
const officer = await signIn("100", "Officier Test", "officer");
const member = await signIn("200", "Membre Test", "member");
const newcomer = await signIn("300", "Nouveau Membre", "member");
const leavingMember = await signIn("400", "Membre Sortant", "member");

await app.roster.importRoster(officer.member, ["VXV-ROSTER-1", ...SEED_ROSTER].join("\n"), "Liste de départ des tests");
const cielGris = (await app.characters.listAvailable()).find((character) => character.firstName === "Ciel");
if (cielGris === undefined) {
  throw new Error("Ciel Gris is missing from the seed roster");
}
await app.characters.link(officer.member, cielGris.id, true);
const signupEventId = await app.events.createEvent(
  officer.member,
  { startsAt: new Date("2031-01-15T20:00:00Z"), raidIds: ["salle-des-thanes"], softReservesPerPlayer: 1 },
  "Événement des tests d'inscription",
);

const seed: E2ESeed = {
  sessions: {
    officer: officer.token,
    member: member.token,
    newcomer: newcomer.token,
    leavingMember: leavingMember.token,
  },
  signupEventId,
};
await writeFile(SEED_FILE, JSON.stringify(seed));

const server = new PGLiteSocketServer({
  db: database,
  host: "127.0.0.1",
  port: DATABASE_PORT,
  maxConnections: MAX_CONNECTIONS,
});
await server.start();
