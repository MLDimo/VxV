import type { Dungeon } from "@vxv/raid-data";
import type { OutputFile } from "./outputFile.ts";

/** The dungeons' data in the addon's Missions part, listed in its .toc: a new dungeon needs no change of code. */
export const DUNGEON_DATA_PATH = "addon/VXV/Missions/Dungeons.lua";

/** The last boss of each dungeon of data/dungeons, by instance, in the Missions part (committed, checked current). */
export function renderDungeonData(dungeons: readonly Dungeon[]): OutputFile {
  const entries = dungeons.map(
    (dungeon) => `    [${String(dungeon.instanceId)}] = ${String(dungeon.lastBoss.encounterId)}, -- ${dungeon.name}`,
  );
  return {
    path: DUNGEON_DATA_PATH,
    content: [
      "-- Generated from data/dungeons by npm run generate (@vxv/data-generator). Do not edit.",
      "local ns = select(2, ...).Missions",
      "",
      "--- The encounter of each dungeon's last boss, by instance: a dungeon counts as done once it is killed.",
      entries.length === 0 ? "ns.DUNGEON_LAST_BOSSES = {}" : ["ns.DUNGEON_LAST_BOSSES = {", ...entries, "}"].join("\n"),
      "",
    ].join("\n"),
  };
}
