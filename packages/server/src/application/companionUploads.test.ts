import type { PGliteInterface } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Member } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createEvent, createMember, createRaidWithLoot } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { createCharacters } from "./characters.ts";
import { createCompanionUploads, type CompanionUpload } from "./companionUploads.ts";
import { createExclusions } from "./exclusions.ts";
import { createGameChanges } from "./gameChanges.ts";
import { createRaidLogs } from "./raidLogs.ts";
import { createRoster } from "./roster.ts";
import { createSignups } from "./signups.ts";
import { createSoftReserves } from "./softReserves.ts";

const ROSTER = "VXV-ROSTER-1\nÐéjà;Vu;ROGUE\nThom;Leboss;PRIEST";
const CAPTURED_AT = new Date("2026-12-10T23:30:00Z");

describe("companion uploads", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let uploads: ReturnType<typeof createCompanionUploads>;
  let officer: Member;
  let eventId: string;

  const logOf = (event: string) =>
    ["VXV-LOG-1", `R;${event};1796936400;1796940720`, "K;2;1796940600", "P;Ðéjà Vu"].join("\n");

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    const unitOfWork = createUnitOfWork(sql);
    const clock = () => new Date("2026-12-11T00:00:00Z");
    const announcer = {
      publish: async () => "",
      update: async () => true,
      remind: async () => {},
      recap: async () => {},
    };
    uploads = createCompanionUploads({
      roster: createRoster({ unitOfWork }),
      raidLogs: createRaidLogs({ unitOfWork, announcer, clock }),
      characters: createCharacters({ unitOfWork }),
      gameChanges: createGameChanges({
        unitOfWork,
        signups: createSignups({ unitOfWork, clock }),
        softReserves: createSoftReserves({ unitOfWork, clock }),
        exclusions: createExclusions({ unitOfWork }),
        announcements: { announceQuietly: async () => true },
      }),
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
    });
  });

  it("keeps the roster and the raids' records for the officers", async () => {
    const member = await createMember(sql, "member", "Membre");
    expect(await uploads.receive(member, upload({}))).toEqual({
      roster: "Réservé aux officiers.",
      raidLogs: ["Réservé aux officiers."],
      characters: 0,
      changes: undefined,
    });
  });

  it("explains a refused part and goes on with the others", async () => {
    const report = await uploads.receive(
      officer,
      upload({ roster: undefined, raidLogs: ["VXV-LOG-1\nK;x;y", logOf("00000000-0000-0000-0000-000000000000")] }),
    );
    expect(report).toEqual({
      roster: undefined,
      raidLogs: ["Ligne 2 illisible : recopiez le journal depuis l'addon.", "Cet événement n'existe pas."],
      characters: 0,
      changes: undefined,
    });
  });
});
