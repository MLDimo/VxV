import { writeFile } from "node:fs/promises";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { renderSeedSql } from "@vxv/data-generator/seedSql";
import { createMigratedPGlite } from "@vxv/database/testing";
import { loadRaids } from "@vxv/raid-data";
import { createDiscordRaidAnnouncer } from "@vxv/bot";
import { createApplication, createDiscordGuild } from "@vxv/server";
import { sqlClientFromPGlite } from "@vxv/server/testing";
import { DATABASE_PORT, DISCORD_ROLES, SEED_FILE, SEED_ROSTER, WEB_ENVIRONMENT, type E2ESeed } from "./environment";

/**
 * PostgreSQL for the end-to-end tests: a migrated PGlite reachable over the network, holding the real raid data.
 * Everything else is prepared through the real use cases, then described in the seed file for the tests.
 */
const MAX_CONNECTIONS = 10;

const database = await createMigratedPGlite();
await database.exec(renderSeedSql(await loadRaids()).content);
const rest = { token: WEB_ENVIRONMENT.DISCORD_BOT_TOKEN, apiUrl: WEB_ENVIRONMENT.DISCORD_API_URL };
const app = createApplication({
  sql: sqlClientFromPGlite(database),
  discordRoles: DISCORD_ROLES,
  guild: createDiscordGuild({ ...rest, guildId: WEB_ENVIRONMENT.DISCORD_GUILD_ID }),
  announcer: createDiscordRaidAnnouncer({
    ...rest,
    channelId: WEB_ENVIRONMENT.DISCORD_RAID_CHANNEL_ID,
    siteUrl: WEB_ENVIRONMENT.SITE_URL,
  }),
});

const signIn = (discordId: string, discordName: string, ...roles: (keyof typeof DISCORD_ROLES)[]) =>
  app.auth.signIn(
    { discordId, discordName },
    roles.map((role) => DISCORD_ROLES[role]),
  );
// Roles are cumulative: the test officer is also treasurer.
const officer = await signIn("100", "Officier Test", "officer", "treasurer");
const member = await signIn("200", "Membre Test");
const newcomer = await signIn("300", "Nouveau Membre");
const leavingMember = await signIn("400", "Membre Sortant");
const lockedMember = await signIn("500", "Membre Verrouillé");
const discordMember = await signIn("600", "Membre Discord");

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
const BRASSARDS = 271096;
await app.softReserves.override(
  officer.member,
  lockedEventId,
  duneSable.id,
  [String(BRASSARDS)],
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
/** The log the addon exports after a raid (VXV-LOG-1), imported as an officer would. */
const importRaidLog = (eventId: string, lines: readonly string[], reason: string) =>
  app.raidLogs.importLog(officer.member, eventId, ["VXV-LOG-1", `R;${eventId};;`, ...lines].join("\n"), reason);
const RAID_NIGHT = Date.UTC(2031, 1, 5, 21) / 1000;
await importRaidLog(
  historyEventId,
  [
    `L;${String(PILLAGE)};${String(BOTTINES)};Dune Sable;soft_reserve;${String(RAID_NIGHT)}`,
    `L;${String(DURGEN)};${String(JAMBIERES)};Ciel Gris;free_roll;${String(RAID_NIGHT + 60)}`,
  ],
  "Raid des tests d'historique",
);

// SR+: Dune Sable reserved the Jambières at an earlier raid, was present and did not get them.
const createThanesEvent = (startsAt: string, reason: string) =>
  app.events.createEvent(
    officer.member,
    { startsAt: new Date(startsAt), raidIds: ["salle-des-thanes"], softReservesPerPlayer: 1 },
    reason,
  );
const reserveJambieres = async (eventId: string) => {
  await app.signups.signUp(lockedMember.member, eventId, {
    characterId: duneSable.id,
    role: "dps",
    spec: "Précision",
    status: "present",
  });
  await app.softReserves.setMine(lockedMember.member, eventId, [String(JAMBIERES)]);
};
const bonusPastEventId = await createThanesEvent("2031-03-05T20:00:00Z", "Raid précédent des tests de SR+");
await reserveJambieres(bonusPastEventId);
// The Brassards given to Ciel Gris at that raid are the loot the correction tests correct.
const FALDRIM = 3493;
const PAST_RAID_NIGHT = Date.UTC(2031, 2, 5, 21) / 1000;
await importRaidLog(
  bonusPastEventId,
  ["P;Dune Sable", `L;${String(FALDRIM)};${String(BRASSARDS)};Ciel Gris;free_roll;${String(PAST_RAID_NIGHT)}`],
  "Raid précédent des tests de SR+",
);
const bonusEventId = await createThanesEvent("2031-03-12T20:00:00Z", "Événement des tests de SR+");
await reserveJambieres(bonusEventId);
const raidLogEventId = await createThanesEvent("2031-04-02T20:00:00Z", "Événement des tests du journal de raid");
const companionEventId = await createThanesEvent("2031-04-09T20:00:00Z", "Événement des tests du compagnon");

const seed: E2ESeed = {
  sessions: {
    officer: officer.token,
    member: member.token,
    newcomer: newcomer.token,
    leavingMember: leavingMember.token,
    lockedMember: lockedMember.token,
    discordMember: discordMember.token,
  },
  signupEventId,
  softReserveEventId,
  lockedEventId,
  historyEventId,
  bonusEventId,
  raidLogEventId,
  companionEventId,
};
await writeFile(SEED_FILE, JSON.stringify(seed));

const server = new PGLiteSocketServer({
  db: database,
  host: "127.0.0.1",
  port: DATABASE_PORT,
  maxConnections: MAX_CONNECTIONS,
});
await server.start();
