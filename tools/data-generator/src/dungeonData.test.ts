import { readFile } from "node:fs/promises";
import { loadDungeons, type Dungeon } from "@vxv/raid-data";
import { evaluateLua } from "@vxv/lua/testing";
import { describe, expect, it } from "vitest";
import { DUNGEON_DATA_PATH, renderDungeonData } from "./dungeonData.ts";

const REPOSITORY = new URL("../../../", import.meta.url);
const thanes: Dungeon = {
  id: "salle-des-thanes",
  name: "La salle des Thanes",
  instanceId: 3065,
  lastBoss: { encounterId: 3496, name: "Durgen Mornemartel" },
};

/** The generated file run as the game loads a part's file, with its namespaces. */
const missions = (content: string, expression: string) =>
  evaluateLua(`NS = { Missions = {} }\n(function(...)\n${content}\nend)("VXV", NS)`, `NS.Missions.${expression}`);

describe("renderDungeonData", () => {
  it("gives the Missions part each dungeon's last boss, by instance", () => {
    expect(missions(renderDungeonData([thanes]).content, "DUNGEON_LAST_BOSSES[3065]")).toBe(3496);
    expect(missions(renderDungeonData([]).content, "DUNGEON_LAST_BOSSES[3065] == nil")).toBe(true);
  });

  it("is current in the repository: npm run generate after any change of data/dungeons", async () => {
    const committed = await readFile(new URL(DUNGEON_DATA_PATH, REPOSITORY), "utf8");
    expect(committed).toBe(renderDungeonData(await loadDungeons()).content);
  });
});
