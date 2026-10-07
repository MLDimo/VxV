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

    it("records a give once: same item of the same boss at the same instant, whoever won it", async () => {
      const { encounterId } = await insertRaidWithBoss(database);
      const memberId = await insertMember(database, "1");
      const deja = await insertCharacter(database, { firstName: "Ðéjà", lastName: "Vu", memberId });
      const thom = await insertCharacter(database, { firstName: "Thom", lastName: "Leboss" });
      const eventId = await insertEvent(database, memberId);
      const give = (characterId: string, lootedAt: string) =>
        database.query(
          `insert into loots (event_id, encounter_id, item_id, character_id, method, looted_at)
           values ($1, $2, $3, $4, 'free_roll', $5)`,
          [eventId, encounterId, ONYXIA_HEAD_ITEM_ID, characterId, lootedAt],
        );

      await expect(give(deja, "2026-12-10T21:00:00Z")).resolves.toBeDefined();
      await expect(give(thom, "2026-12-10T21:00:00Z")).rejects.toThrow(/loots_one_give/);
      await expect(give(thom, "2026-12-10T21:05:00Z")).resolves.toBeDefined();
    });
  });

  describe("attendance", () => {
    it("records a character once per event", async () => {
      const memberId = await insertMember(database, "1");
      const characterId = await insertCharacter(database, { firstName: "Ðéjà", lastName: "Vu", memberId });
      const eventId = await insertEvent(database, memberId);
      const attend = () =>
        database.query("insert into event_attendance (event_id, character_id) values ($1, $2)", [eventId, characterId]);

      await expect(attend()).resolves.toBeDefined();
      await expect(attend()).rejects.toThrow(/duplicate key/);
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

  describe("bets", () => {
    async function insertBet(memberId: string, labels: string[]): Promise<{ betId: string; choiceIds: string[] }> {
      const { rows } = await database.query<{ id: string }>(
        "insert into bets (title, closes_at, created_by) values ('Qui meurt ?', now() + interval '1 day', $1) returning id",
        [memberId],
      );
      const betId = rows[0]?.id ?? "";
      const choiceIds: string[] = [];
      for (const [index, label] of labels.entries()) {
        const choice = await database.query<{ id: string }>(
          "insert into bet_choices (bet_id, position, label) values ($1, $2, $3) returning id",
          [betId, index + 1, label],
        );
        choiceIds.push(choice.rows[0]?.id ?? "");
      }
      return { betId, choiceIds };
    }

    const insertStake = (betId: string, memberId: string, choiceId: string | undefined) =>
      database.query(
        "insert into stakes (bet_id, member_id, choice_id, amount, placed_at) values ($1, $2, $3, 10, now())",
        [betId, memberId, choiceId],
      );

    it("takes one stake per member and bet", async () => {
      const memberId = await insertMember(database, "1");
      const { betId, choiceIds } = await insertBet(memberId, ["Un tank", "Un heal"]);
      await insertStake(betId, memberId, choiceIds[0]);
      await expect(insertStake(betId, memberId, choiceIds[1])).rejects.toThrow(/duplicate key/);
    });

    it("refuses a stake on another bet's choice", async () => {
      const memberId = await insertMember(database, "1");
      const first = await insertBet(memberId, ["Un tank", "Un heal"]);
      const second = await insertBet(memberId, ["Oui", "Non"]);
      await expect(insertStake(first.betId, memberId, second.choiceIds[0])).rejects.toThrow(/foreign key/);
    });
  });

  describe("guild cash", () => {
    const record = (memberId: string, kind: string, amount: number) =>
      database.query(
        `insert into cash_movements (occurred_at, kind, amount, label, reason, recorded_by)
         values (now(), $2::cash_movement_kind, $3, 'Mouvement', 'Motif', $1)`,
        [memberId, kind, amount],
      );

    it("takes donations in and sends expenses out, never the other way", async () => {
      const treasurer = await insertMember(database, "1");
      await record(treasurer, "donation", 500);
      await record(treasurer, "expense", -120);
      await expect(record(treasurer, "donation", -5)).rejects.toThrow(/cash_movements_sign/);
      await expect(record(treasurer, "expense", 5)).rejects.toThrow(/cash_movements_sign/);
    });

    it.each([
      ["update", "update cash_movements set amount = 1"],
      ["delete", "delete from cash_movements"],
      ["truncate", "truncate cash_movements"],
    ])("rejects %s", async (_operation, sql) => {
      await record(await insertMember(database, "1"), "donation", 500);
      await expect(database.exec(sql)).rejects.toThrow(/cash_movements is append-only/);
    });
  });

  describe("professions", () => {
    it("records a known recipe only with its character's profession", async () => {
      const member = await insertMember(database, "1");
      const character = await insertCharacter(database, {
        firstName: "Sira",
        lastName: "Ventargent",
        memberId: member,
      });
      await database.query("insert into recipes (id, profession_id, name) values (3275, 129, 'Bandage en lin')");
      const know = () =>
        database.query("insert into known_recipes (character_id, profession_id, recipe_id) values ($1, 129, 3275)", [
          character,
        ]);
      await expect(know()).rejects.toThrow(/foreign key/);
      await database.query(
        `insert into professions (character_id, profession_id, name, skill_level, max_level, read_at, sent_by)
         values ($1, 129, 'Secourisme', 22, 75, now(), $2)`,
        [character, member],
      );
      await know();
      await expect(
        database.query("insert into recipes (id, profession_id, name) values (3276, 129, '  ')"),
      ).rejects.toThrow(/recipes_name_not_blank/);
    });
  });

  describe("deathrolls", () => {
    it("takes the loser among the players, and each roll in its range", async () => {
      const member = await insertMember(database, "1");
      const thom = await insertCharacter(database, { firstName: "Thom", lastName: "Leboss", memberId: member });
      const vorn = await insertCharacter(database, { firstName: "Vorn", lastName: "Cendrelune" });
      const sira = await insertCharacter(database, { firstName: "Sira", lastName: "Ventargent" });
      const game = (id: string, loser: string) =>
        database.query(
          `insert into deathrolls (id, challenger_id, challenged_id, stake, start_number, accepted_at, ended_at, loser_id,
                                   sent_by, recorded_at)
           values ($1, $2, $3, 500, 1000, now(), now(), $4, $5, now())`,
          [id, thom, vorn, loser, member],
        );
      await expect(game("g0", sira)).rejects.toThrow(/deathrolls_loser_plays/);
      await game("g1", vorn);
      const roll = (high: number, result: number) =>
        database.query(
          "insert into deathroll_rolls (deathroll_id, position, character_id, high, result) values ('g1', $1, $2, $3, $4)",
          [high, vorn, high, result],
        );
      await roll(1000, 412);
      await expect(roll(87, 88)).rejects.toThrow(/deathroll_rolls_in_range/);
    });
  });

  describe("titles", () => {
    const award = (memberId: string, title: string, score: number | null) =>
      database.query(
        "insert into title_awards (week, title, member_id, score, awarded_at) values ($1, $2, $3, $4, now())",
        ["2026-10-07", title, memberId, score],
      );

    it("gives each title once a week, for a positive score or none (a title an officer gives)", async () => {
      const member = await insertMember(database, "1");
      await award(member, "gamblingKing", 125);
      await award(member, "wellFed", 3);
      await award(member, "princess", null);
      await expect(award(await insertMember(database, "2"), "gamblingKing", 200)).rejects.toThrow(/title_awards_pkey/);
      await expect(award(member, "debtKing", 0)).rejects.toThrow(/title_awards_score_check/);
    });
  });

  describe("boss fights", () => {
    it("keeps a boss killed with a known encounter and a healing total that is not negative", async () => {
      const sender = await insertMember(database, "1");
      const fight = (encounterId: number, totalHealing: number) =>
        database.query(
          `insert into boss_fights (encounter_id, ended_at, content, total_healing, sent_by, received_at)
           values ($1, now(), 'VXV-COMBAT-1', $2, $3, now())`,
          [encounterId, totalHealing, sender],
        );
      await fight(1084, 0);
      await expect(fight(0, 10)).rejects.toThrow(/boss_fights_encounter_id_check/);
      await expect(fight(1084, -1)).rejects.toThrow(/boss_fights_total_healing_check/);
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
