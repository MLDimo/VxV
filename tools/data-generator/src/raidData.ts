import type { Raid } from "@vxv/raid-data";
import { toLuaLiteral } from "@vxv/lua";
import type { OutputFile } from "./outputFile.ts";

/** Global table the raids' data register in: VXV_RaidData[raidId] = raid. */
export const RAID_DATA_GLOBAL = "VXV_RaidData";

/** The raids' data in the addon, listed in its .toc: a new raid needs no change of code. */
export const RAID_DATA_PATH = "addon/VXV/Data/Raids.lua";

/** Every raid of data/raids registered in VXV_RaidData, in a file of the addon (committed, checked current). */
export function renderRaidData(raids: readonly Raid[]): OutputFile {
  const lines = raids.map((raid) => {
    const table = {
      name: raid.name,
      instanceId: raid.instanceId,
      bosses: raid.bosses.map((boss) => ({
        encounterId: boss.encounterId,
        name: boss.name,
        loot: boss.loot.map((item) => ({ itemId: item.itemId, name: item.name })),
      })),
    };
    return `${RAID_DATA_GLOBAL}[${toLuaLiteral(raid.id)}] = ${toLuaLiteral(table)}`;
  });
  return {
    path: RAID_DATA_PATH,
    content: [
      "-- Generated from data/raids by npm run generate (@vxv/data-generator). Do not edit.",
      `${RAID_DATA_GLOBAL} = ${RAID_DATA_GLOBAL} or {}`,
      ...lines,
      "",
    ].join("\n"),
  };
}
