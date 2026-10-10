import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Member } from "../domain/members.ts";
import { bossFightRepository } from "../infrastructure/postgres/bossFights.ts";
import { bossLootRepository } from "../infrastructure/postgres/bossLoot.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createEvent, createMember, createRaidWithLoot, testGuild } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createCharacters } from "./characters.ts";
import { createCompanionUploads, type CompanionUpload } from "./companionUploads.ts";
import { createDuels } from "./duels.ts";
import { createEvents } from "./events.ts";
import { createExclusions } from "./exclusions.ts";
import { createGameChanges } from "./gameChanges.ts";
import { createRaidLogs } from "./raidLogs.ts";
import { createRoster } from "./roster.ts";
import { createSignups } from "./signups.ts";
import { createSoftReserves } from "./softReserves.ts";
import { createBets } from "./bets.ts";
import { createBossFights } from "./bossFights.ts";
import { createMissions } from "./missions.ts";
import { createArtisans } from "./artisans.ts";
import { createDeathrolls } from "./deathrolls.ts";
import { createItems } from "./items.ts";

const ROSTER = "VXV-ROSTER-1\nÐéjà;Vu;ROGUE\nThom;Leboss;PRIEST";
const CAPTURED_AT = new Date("2026-12-10T23:30:00Z");

describe("companion uploads", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let uploads: ReturnType<typeof createCompanionUploads>;
  let officer: Member;
  let eventId: string;

  const logOf = (event: string) =>
    ["VXV-LOG-2", `R;${event};1796936400;1796940720`, "K;2;1796940600", "P;Ðéjà Vu"].join("\n");

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    const unitOfWork = createUnitOfWork(sql);
    const clock = () => new Date("2026-12-11T00:00:00Z");
    const announcer = {
      publish: async () => "",
      update: async () => true,
      remind: async () => {},
      remindSoftReserves: async () => {},
      recap: async () => {},
    };
    const missions = createMissions({ unitOfWork, clock });
    const missionAnnouncements = { announceQuietly: async () => true };
    uploads = createCompanionUploads({
      roster: createRoster({ unitOfWork }),
      raidLogs: createRaidLogs({ unitOfWork, announcer, clock }),
      characters: createCharacters({ unitOfWork }),
      gameChanges: createGameChanges({
        unitOfWork,
        clock,
        events: createEvents({ unitOfWork, clock, guild: testGuild }),
        signups: createSignups({ unitOfWork, clock, guild: testGuild }),
        softReserves: createSoftReserves({ unitOfWork, clock }),
        exclusions: createExclusions({ unitOfWork }),
        bets: createBets({ unitOfWork, clock }),
        betAnnouncements: { announceQuietly: async () => true },
        announcements: { announceQuietly: async () => true },
        missions,
        missionAnnouncements,
        duels: createDuels({
          unitOfWork,
          clock,
          announcements: { announceQuietly: async () => true },
          betAnnouncements: { announceQuietly: async () => true },
        }),
      }),
      missions,
      missionAnnouncements,
      artisans: createArtisans({ unitOfWork }),
      deathrolls: createDeathrolls({ unitOfWork, clock, announcer: { announce: async () => {} } }),
      bossFights: createBossFights({ unitOfWork, clock }),
      items: createItems({ unitOfWork }),
    });
    officer = await createMember(sql, "officer", "Officier");
    await createRaidWithLoot(sql);
    eventId = await createEvent(sql, officer, new Date("2026-12-10T20:00:00Z"), ["onyxia"]);
  });

  afterEach(async () => {
    await database.close();
  });

  const upload = (changes: Partial<CompanionUpload>): CompanionUpload => ({
    roster: { text: ROSTER, capturedAt: CAPTURED_AT },
    raidLogs: [logOf(eventId)],
    characters: [{ name: "Ðéjà Vu", race: "Scourge", sex: 3 }],
    changes: [],
    counters: [],
    texts: {},
    ...changes,
  });

  it("takes an officer's roster, raids' records and characters", async () => {
    const first = await uploads.receive(officer, upload({}));
    expect(first.roster).toBe(
      "Liste de guilde importée : 2 ajoutés, 0 départs, 0 retours, 0 changements de classe, 2 personnages dans la guilde.",
    );
    expect(first.raidLogs).toEqual(["Journal du raid importé : 1 boss tué, 1 présent, 0 objets ajoutés."]);
    const [deja] = (await characterRepository(sql).listAll()).filter((character) => character.firstName === "Ðéjà");
    await characterRepository(sql).link(deja?.id ?? "", officer.id);
    const again = await uploads.receive(officer, upload({}));
    expect(again).toEqual({
      roster: "Liste de guilde plus ancienne que la dernière importée : ignorée.",
      raidLogs: ["Journal du raid à jour."],
      characters: 1,
      changes: undefined,
      texts: [],
    });
  });

  it("keeps the roster and the raids' records for the officers", async () => {
    const member = await createMember(sql, "member", "Membre");
    expect(await uploads.receive(member, upload({}))).toEqual({
      roster: "Réservé aux officiers.",
      raidLogs: ["Réservé aux officiers."],
      characters: 0,
      changes: undefined,
      texts: [],
    });
  });

  it("explains a refused part and goes on with the others", async () => {
    const report = await uploads.receive(
      officer,
      upload({ roster: undefined, raidLogs: ["VXV-LOG-2\nK;x;y", logOf("00000000-0000-0000-0000-000000000000")] }),
    );
    expect(report).toEqual({
      roster: undefined,
      raidLogs: ["Ligne 2 illisible : recopiez le journal depuis l'addon.", "Cet événement n'existe pas."],
      characters: 0,
      changes: undefined,
      texts: [],
    });
  });

  it("keeps the professions of a member's own characters and those an officer relays, once each", async () => {
    await uploads.receive(officer, upload({}));
    const member = await createMember(sql, "member", "Membre");
    const characters = await characterRepository(sql).listAll();
    const idOf = (firstName: string) => characters.find((character) => character.firstName === firstName)?.id ?? "";
    await characterRepository(sql).link(idOf("Ðéjà"), officer.id);
    await characterRepository(sql).link(idOf("Thom"), member.id);
    const professions = (name: string) =>
      ["VXV-METIERS-1", `C;${name}`, "P;129;Secourisme;22;75;1796904000;1796904060", "R;129;3275;Bandage en lin"].join(
        "\n",
      );
    const only = (texts: string[]) =>
      upload({ roster: undefined, raidLogs: [], characters: [], texts: { metiers: texts } });
    // A member's own character counts, another member's does not.
    const sent = await uploads.receive(member, only([professions("Thom Leboss"), professions("Ðéjà Vu")]));
    expect(sent.texts).toEqual(["Métiers : 1 mis à jour."]);
    expect((await uploads.receive(officer, only([professions("Thom Leboss")]))).texts).toEqual(["Métiers à jour."]);
    expect((await uploads.receive(officer, only([professions("Ðéjà Vu")]))).texts).toEqual(["Métiers : 1 mis à jour."]);
    expect((await uploads.receive(member, only(["VXV-METIERS-1\nP;x"]))).texts).toEqual(["Ligne 2 illisible."]);
  });

  it("keeps what the game says of the raids' items, the first reading of each", async () => {
    const member = await createMember(sql, "member", "Membre");
    const only = (lines: string[]) =>
      upload({
        roster: undefined,
        raidLogs: [],
        characters: [],
        texts: { objets: [["VXV-OBJETS-1", ...lines].join("\n")] },
      });
    // The cape is a cloak, the bag read as leather; item 99 drops in none of the raids.
    const read = await uploads.receive(
      member,
      only(["I;10;4;1;INVTYPE_CLOAK", "I;21;4;2;INVTYPE_WAIST", "I;99;2;15;INVTYPE_WEAPON"]),
    );
    expect(read.texts).toEqual(["Objets des raids : 2 nouveaux."]);
    expect((await uploads.receive(member, only(["I;21;4;4;INVTYPE_WAIST"]))).texts).toEqual([
      "Objets des raids à jour.",
    ]);
    const loot = await bossLootRepository(sql).listForRaids(["onyxia"]);
    expect(loot.find((item) => item.itemId === 21)?.kind).toEqual({
      itemClass: 4,
      itemSubclass: 2,
      equipSlot: "INVTYPE_WAIST",
    });
    expect(loot.find((item) => item.itemId === 20)?.kind).toBeUndefined();
    expect((await uploads.receive(member, only(["I;x"]))).texts).toEqual(["Ligne 2 illisible."]);
  });

  it("keeps each boss killed once, the most complete record of the companions who sent it", async () => {
    const fight = (healing: number, endedAt: number) =>
      [
        "VXV-COMBAT-1",
        `F;1084;Onyxia;9;40;${String(endedAt - 240)};${String(endedAt)}`,
        `H;Player-1;Ðéjà;${String(healing)}`,
      ].join("\n");
    const only = (texts: string[]) =>
      upload({ roster: undefined, raidLogs: [], characters: [], texts: { combat: texts } });
    const member = await createMember(sql, "member", "Membre");
    expect((await uploads.receive(member, only([fight(500, 1796940000)]))).texts).toEqual([
      "Combats de boss : 1 nouveau.",
    ]);
    // Another raider's companion, its clock a minute off, saw less of it, then more.
    expect((await uploads.receive(officer, only([fight(300, 1796940060)]))).texts).toEqual(["Combats de boss à jour."]);
    expect((await uploads.receive(officer, only([fight(800, 1796940060)]))).texts).toEqual([
      "Combats de boss : 1 nouveau.",
    ]);
    const kept = await bossFightRepository(sql).listEndedSince(undefined);
    expect(kept.map(({ totalHealing }) => totalHealing)).toEqual([800]);
    expect((await uploads.receive(member, only(["VXV-COMBAT-1\nH;x"]))).texts).toEqual(["Ligne 2 illisible."]);
  });
});
