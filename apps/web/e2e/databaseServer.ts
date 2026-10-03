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

const signIn = (discordId: string, discordName: string, ...roles: (keyof typeof DISCORD_ROLES)[]) =>
  app.auth.signIn(
    { discordId, discordName },
    roles.map((role) => DISCORD_ROLES[role]),
  );
// Roles are cumulative: the test officer is also treasurer.
const officer = await signIn("100", "Officier Test", "member", "officer", "treasurer");
const member = await signIn("200", "Membre Test", "member");
const newcomer = await signIn("300", "Nouveau Membre", "member");
const leavingMember = await signIn("400", "Membre Sortant", "member");
const lockedMember = await signIn("500", "Membre Verrouillé", "member");

await app.roster.importRoster(officer.member, ["VXV-ROSTER-1", ...SEED_ROSTER].join("\n"), "Liste de départ des tests");
async function seedCharacter(firstName: string) {
  const character = (await app.characters.listAvailable()).find((candidate) => candidate.firstName === firstName);
  if (character === undefined) {
    throw new Error(`${firstName} is missing from the seed roster`);
  }
  return character;
}
const cielGris = await seedCharacter("Ciel");
const duneSable = await seedCharacter("Dune");
await app.characters.link(officer.member, cielGris.id, true);
await app.characters.link(lockedMember.member, duneSable.id, true);
const signupEventId = await app.events.createEvent(
  officer.member,
  { startsAt: new Date("2031-01-15T20:00:00Z"), raidIds: ["salle-des-thanes"], softReservesPerPlayer: 1 },
  "Événement des tests d'inscription",
);

const softReserveEventId = await app.events.createEvent(
  officer.member,
  { startsAt: new Date("2031-01-22T20:00:00Z"), raidIds: ["salle-des-thanes"], softReservesPerPlayer: 1 },
  "Événement des tests de SR",
);
await app.signups.signUp(officer.member, softReserveEventId, {
  characterId: cielGris.id,
  role: "tank",
  spec: "Protection",
  status: "present",
});

const LOCKED_EVENT_DELAY_MS = 10 * 60 * 1000;
const lockedEventId = await app.events.createEvent(
  officer.member,
  {
    startsAt: new Date(Date.now() + LOCKED_EVENT_DELAY_MS),
    raidIds: ["salle-des-thanes"],
    softReservesPerPlayer: 1,
  },
  "Événement verrouillé des tests",
);
await app.signups.signUp(lockedMember.member, lockedEventId, {
  characterId: duneSable.id,
  role: "dps",
  spec: "Précision",
  status: "present",
});
const brassards = 271096;
await app.softReserves.override(
  officer.member,
  lockedEventId,
  duneSable.id,
  [String(brassards)],
  "SR de départ des tests",
);

const historyEventId = await app.events.createEvent(
  officer.member,
  { startsAt: new Date("2031-02-05T20:00:00Z"), raidIds: ["salle-des-thanes"], softReservesPerPlayer: 1 },
  "Événement des tests d'historique",
);
await app.signups.signUp(lockedMember.member, historyEventId, {
  characterId: duneSable.id,
  role: "dps",
  spec: "Précision",
  status: "present",
});
const BOTTINES = 270229;
const PILLAGE = 3494;
const JAMBIERES = 270260;
const DURGEN = 3496;
await app.softReserves.setMine(lockedMember.member, historyEventId, [String(BOTTINES)]);
// Loots are recorded by the addon from P6 on; until then the tests insert them directly.
await database.query(
  `insert into loots (event_id, encounter_id, item_id, character_id, looted_at)
   values ($1, $2, $3, $4, now()), ($1, $5, $6, $7, now())`,
  [historyEventId, PILLAGE, BOTTINES, duneSable.id, DURGEN, JAMBIERES, cielGris.id],
);

const seed: E2ESeed = {
  sessions: {
    officer: officer.token,
    member: member.token,
    newcomer: newcomer.token,
    leavingMember: leavingMember.token,
    lockedMember: lockedMember.token,
  },
  signupEventId,
  softReserveEventId,
  lockedEventId,
  historyEventId,
};
await writeFile(SEED_FILE, JSON.stringify(seed));

const server = new PGLiteSocketServer({
  db: database,
  host: "127.0.0.1",
  port: DATABASE_PORT,
  maxConnections: MAX_CONNECTIONS,
});
await server.start();
