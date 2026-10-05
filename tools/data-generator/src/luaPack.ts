import type { Raid } from "@vxv/raid-data";
import { toLuaLiteral } from "./luaLiteral.ts";
import type { OutputFile } from "./outputFile.ts";

/** Interface version of WoW Forever, confirmed in Phase 0. */
export const ADDON_INTERFACE = 16001;

/** Global table shared by every data pack: VXV_RaidData[raidId] = raid. */
export const RAID_DATA_GLOBAL = "VXV_RaidData";

const DATA_FILE = "Data.lua";

/** "salle-des-thanes" becomes "VXV_Data_SalleDesThanes". */
export function packFolderName(raidId: string): string {
  const pascalCase = raidId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  return `VXV_Data_${pascalCase}`;
}

function renderToc(raid: Raid): string {
  return [
    `## Interface: ${ADDON_INTERFACE}`,
    `## Title: VXV Data - ${raid.name}`,
    `## Notes: Données du raid ${raid.name} pour VXV (fichier généré)`,
    "## Author: VXV",
    "## Version: @project-version@",
    // Loaded with the game: a few kilobytes, and loading on demand (C_AddOns.LoadAddOn) is not measured on Forever.
    "## Dependencies: VXV_Core",
    "",
    DATA_FILE,
    "",
  ].join("\n");
}

function renderData(raid: Raid): string {
  const table = {
    name: raid.name,
    instanceId: raid.instanceId,
    bosses: raid.bosses.map((boss) => ({
      encounterId: boss.encounterId,
      name: boss.name,
      loot: boss.loot.map((item) => ({ itemId: item.itemId, name: item.name })),
    })),
  };
  return [
    `-- Generated from data/raids/${raid.id}.json by @vxv/data-generator. Do not edit.`,
    `${RAID_DATA_GLOBAL} = ${RAID_DATA_GLOBAL} or {}`,
    `${RAID_DATA_GLOBAL}[${toLuaLiteral(raid.id)}] = ${toLuaLiteral(table)}`,
    "",
  ].join("\n");
}

/** The addon folder of one raid: its .toc and its data file. */
export function renderLuaPack(raid: Raid): OutputFile[] {
  const folder = `addon/${packFolderName(raid.id)}`;
  return [
    { path: `${folder}/${packFolderName(raid.id)}.toc`, content: renderToc(raid) },
    { path: `${folder}/${DATA_FILE}`, content: renderData(raid) },
  ];
}
