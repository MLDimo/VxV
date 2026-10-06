import { describe, expect, it } from "vitest";
import type { Character } from "./characters.ts";
import { parseRaidLog, planRaidLogImport, RAID_LOG_HEADER, RaidLogFormatError } from "./raidLog.ts";
import { buildRaidRecap } from "./raidRecap.ts";

const LOG = [
  RAID_LOG_HEADER,
  "R;e1;1796936400;1796940720",
  "K;1084;1796940600",
  "P;Thom Leboss",
  "P;Ðéjà Vu",
  "P;Inconnu Total",
  "L;1084;20;Thom Leboss;soft_reserve_plus;1796940660",
  "L;1084;30;Ðéjà Vu;loot_council;1796940670",
  "L;1084;99;Thom Leboss;free_roll;1796940680",
  "D;Thom Leboss;1",
  "D;Ðéjà Vu;3",
  "M;Thom Leboss;182000;4500",
  "M;Ðéjà Vu;96000;0",
  "A;Ðéjà Vu;2",
].join("\n");

function character(id: string, firstName: string, lastName: string): Character {
  return { id, firstName, lastName, characterClass: "ROGUE", memberId: undefined, isMain: false, inGuild: true };
}

describe("parseRaidLog", () => {
  it("reads the event, the kills, the players present, the gives and the deaths", () => {
    const log = parseRaidLog(LOG);
    expect(log.eventId).toBe("e1");
    expect(log.startedAt).toEqual(new Date("2026-12-10T21:00:00Z"));
    expect(log.kills).toEqual([{ encounterId: 1084, killedAt: new Date("2026-12-10T22:10:00Z") }]);
    expect(log.present).toEqual(["Thom Leboss", "Ðéjà Vu", "Inconnu Total"]);
    expect(log.loots[0]).toEqual({
      encounterId: 1084,
      itemId: 20,
      winner: "Thom Leboss",
      method: "soft_reserve_plus",
      lootedAt: new Date("2026-12-10T22:11:00Z"),
    });
    expect(log.deaths).toEqual([
      { name: "Thom Leboss", count: 1 },
      { name: "Ðéjà Vu", count: 3 },
    ]);
    expect(log.meter).toEqual([
      { name: "Thom Leboss", damage: 182000, healing: 4500 },
      { name: "Ðéjà Vu", damage: 96000, healing: 0 },
    ]);
    expect(log.raised).toEqual([{ name: "Ðéjà Vu", count: 2 }]);
  });

  it("still reads the version 1 of an addon not updated yet, without the meter and the resurrections", () => {
    const log = parseRaidLog(["VXV-LOG-1", "R;e1;;", "D;Thom Leboss;1"].join("\n"));
    expect(log).toMatchObject({ eventId: "e1", deaths: [{ name: "Thom Leboss", count: 1 }], meter: [], raised: [] });
  });

  it("lists every problem with its line number", () => {
    const broken = [RAID_LOG_HEADER, "R;e1;;", "L;1084;20;Thom Leboss;cadeau;1", "K;boss;1", "M;Thom Leboss;-5;0"].join(
      "\n",
    );
    expect(() => parseRaidLog(broken)).toThrow(RaidLogFormatError);
    try {
      parseRaidLog(broken);
    } catch (error) {
      expect((error as RaidLogFormatError).problems).toEqual([
        "Ligne 3 illisible : recopiez le journal depuis l'addon.",
        "Ligne 4 illisible : recopiez le journal depuis l'addon.",
        "Ligne 5 illisible : recopiez le journal depuis l'addon.",
      ]);
    }
    expect(() => parseRaidLog("VXV-ROSTER-1")).toThrow(/doit commencer par la ligne VXV-LOG-2/);
    expect(() => parseRaidLog(`${RAID_LOG_HEADER}\nP;Thom Leboss`)).toThrow(/ligne R manquante/);
  });
});

describe("planRaidLogImport", () => {
  it("matches the players with the roster and keeps the gives of the event's raids", () => {
    const plan = planRaidLogImport(parseRaidLog(LOG), {
      characters: [character("c-thom", "Thom", "Leboss"), character("c-deja", "Ðéjà", "Vu")],
      encounterIds: new Set([1084]),
      itemIds: new Set([20, 30]),
    });
    expect(plan.presentIds).toEqual(["c-thom", "c-deja"]);
    expect(plan.loots.map((loot) => [loot.itemId, loot.characterId, loot.method])).toEqual([
      [20, "c-thom", "soft_reserve_plus"],
      [30, "c-deja", "loot_council"],
    ]);
    expect(plan.unknownCharacters).toEqual(["Inconnu Total"]);
    expect(plan.unknownLoots).toBe(1);
  });
});

describe("buildRaidRecap", () => {
  it("names the bosses and items, measures the raid and orders the deaths", () => {
    const event = {
      id: "e1",
      startsAt: new Date("2026-12-10T21:00:00Z"),
      softReservesPerPlayer: 1,
      raids: [{ id: "onyxia", name: "Onyxia" }],
      discordMessageId: undefined,
    };
    const recap = buildRaidRecap(event, parseRaidLog(LOG), {
      bosses: new Map([[1084, "Onyxia"]]),
      items: new Map([
        [20, "Tête d'Onyxia"],
        [30, "Écaille d'Onyxia"],
      ]),
    });
    expect(recap.kills).toEqual(["Onyxia"]);
    expect(recap.durationMs).toBe(72 * 60 * 1000);
    expect(recap.loots).toEqual([
      { itemName: "Tête d'Onyxia", winnerName: "Thom Leboss", method: "soft_reserve_plus" },
      { itemName: "Écaille d'Onyxia", winnerName: "Ðéjà Vu", method: "loot_council" },
    ]);
    expect(recap.deaths).toEqual([
      { name: "Ðéjà Vu", count: 3 },
      { name: "Thom Leboss", count: 1 },
    ]);
  });
});
