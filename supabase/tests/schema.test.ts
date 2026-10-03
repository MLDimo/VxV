import type { PGliteInterface } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMigratedDatabase } from "../src/testing.ts";
import {
  insertCharacter,
  insertEvent,
  insertMember,
  insertRaidWithBoss,
  insertSignup,
  ONYXIA_HEAD_ITEM_ID,
} from "./fixtures.ts";

describe("initial schema", () => {
  let database: PGliteInterface;

  beforeEach(async () => {
    database = await createMigratedDatabase();
  });

  afterEach(async () => {
    await database.close();
  });

  it("enables row level security on every table", async () => {
    const { rows } = await database.query<{ tablename: string; rowsecurity: boolean }>(
      "select tablename, rowsecurity from pg_tables where schemaname = 'public'",
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter((table) => !table.rowsecurity).map((table) => table.tablename)).toEqual([]);
  });

  describe("members", () => {
    it("gives the member role by default", async () => {
      const memberId = await insertMember(database, "1");
      const { rows } = await database.query<{ roles: string[] }>(
        "select roles::text[] as roles from members where id = $1",
        [memberId],
      );
      expect(rows[0]?.roles).toEqual(["member"]);
    });

    it("accepts several roles and refuses none", async () => {
      const memberId = await insertMember(database, "1");
      await database.query("update members set roles = '{member,treasurer,officer}' where id = $1", [memberId]);
      await expect(database.query("update members set roles = '{}' where id = $1", [memberId])).rejects.toThrow(
        /members_roles_not_empty/,
      );
    });
  });

  describe("characters", () => {
    it("rejects a second character with the same first and last name", async () => {
      await insertCharacter(database, { firstName: "Ðéjà", lastName: "Vu" });
      await expect(insertCharacter(database, { firstName: "Ðéjà", lastName: "Vu" })).rejects.toThrow(/duplicate key/);
    });

    it("accepts the same first name with another last name", async () => {
      await insertCharacter(database, { firstName: "Ðéjà", lastName: "Vu" });
      await expect(insertCharacter(database, { firstName: "Ðéjà", lastName: "Lu" })).resolves.toBeTypeOf("string");
    });

    it("allows only one main character per member", async () => {
      const memberId = await insertMember(database, "1");
      await insertCharacter(database, { firstName: "Ðéjà", lastName: "Vu", memberId, isMain: true });
      await expect(
        insertCharacter(database, { firstName: "Eole", lastName: "Hermes", memberId, isMain: true }),
      ).rejects.toThrow(/characters_one_main_per_member/);
    });

    it("refuses a main character without a member", async () => {
      await expect(insertCharacter(database, { firstName: "Ðéjà", lastName: "Vu", isMain: true })).rejects.toThrow(
        /characters_main_requires_member/,
      );
    });
  });

  describe("bosses", () => {
    it("lets a raid reorder its bosses inside one transaction", async () => {
      const { raidId } = await insertRaidWithBoss(database);
      await database.exec(`insert into bosses values (1085, '${raidId}', 'Second', 2)`);
      await database.exec(`
        begin;
        update bosses set position = 2 where encounter_id = 1084;
        update bosses set position = 1 where encounter_id = 1085;
        commit;
      `);
      const { rows } = await database.query<{ encounter_id: number }>(
        "select encounter_id from bosses order by position",
      );
      expect(rows.map((boss) => boss.encounter_id)).toEqual([1085, 1084]);
    });

    it("rejects two bosses at the same position in a raid", async () => {
      const { raidId } = await insertRaidWithBoss(database);
      await expect(database.exec(`insert into bosses values (1085, '${raidId}', 'Second', 1)`)).rejects.toThrow(
        /bosses_raid_position_key/,
      );
    });
  });

  describe("soft reserves", () => {
    it("requires a sign-up to the same event", async () => {
      await insertRaidWithBoss(database);
      const memberId = await insertMember(database, "1");
      const characterId = await insertCharacter(database, { firstName: "Ðéjà", lastName: "Vu", memberId });
      const eventId = await insertEvent(database, memberId);
      const reserve = () =>
        database.query("insert into soft_reserves (event_id, character_id, item_id) values ($1, $2, $3)", [
          eventId,
          characterId,
          ONYXIA_HEAD_ITEM_ID,
        ]);

      await expect(reserve()).rejects.toThrow(/foreign key/);
      await insertSignup(database, { eventId, characterId, memberId });
      await expect(reserve()).resolves.toBeDefined();
    });
  });

  describe("loots", () => {
    it("requires how the item was given", async () => {
      const { encounterId } = await insertRaidWithBoss(database);
      const memberId = await insertMember(database, "1");
      const characterId = await insertCharacter(database, { firstName: "Ðéjà", lastName: "Vu", memberId });
      const eventId = await insertEvent(database, memberId);
      const recordLoot = (method: string | null) =>
        database.query(
          `insert into loots (event_id, encounter_id, item_id, character_id, method, looted_at)
           values ($1, $2, $3, $4, $5, now())`,
          [eventId, encounterId, ONYXIA_HEAD_ITEM_ID, characterId, method],
        );

      await expect(recordLoot(null)).rejects.toThrow(/null value/);
      await expect(recordLoot("gift")).rejects.toThrow(/invalid input value/);
      await expect(recordLoot("free_roll")).resolves.toBeDefined();
    });
  });

  describe("sign-ups", () => {
    it("allows a single sign-up per member and event, whatever the character", async () => {
      const memberId = await insertMember(database, "1");
      const main = await insertCharacter(database, { firstName: "Ðéjà", lastName: "Vu", memberId });
      const reroll = await insertCharacter(database, { firstName: "Eole", lastName: "Hermes", memberId });
      const eventId = await insertEvent(database, memberId);
      await insertSignup(database, { eventId, characterId: main, memberId });
      await expect(insertSignup(database, { eventId, characterId: reroll, memberId })).rejects.toThrow(
        /signups_one_per_member/,
      );
    });
  });

  describe("journal", () => {
    async function insertEntry(reason: string): Promise<void> {
      const actorId = await insertMember(database, "officer");
      await database.query(
        `insert into journal (actor_id, action, entity, entity_id, before, after, reason)
         values ($1, 'exclude', 'item', '18423', null, '{"excluded": true}', $2)`,
        [actorId, reason],
      );
    }

    it("records an officer action with its reason", async () => {
      await insertEntry("Objet réservé à la guilde");
      const { rows } = await database.query<{ reason: string }>("select reason from journal");
      expect(rows).toEqual([{ reason: "Objet réservé à la guilde" }]);
    });

    it("rejects a blank reason", async () => {
      await expect(insertEntry("   ")).rejects.toThrow(/journal_reason_not_blank/);
    });

    it.each([
      ["update", "update journal set reason = 'modifié'"],
      ["delete", "delete from journal"],
      ["truncate", "truncate journal"],
    ])("rejects %s", async (_operation, sql) => {
      await insertEntry("Motif");
      await expect(database.exec(sql)).rejects.toThrow(/journal is append-only/);
    });
  });
});
