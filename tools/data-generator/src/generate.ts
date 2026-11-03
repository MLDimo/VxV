import type { Dungeon, Raid } from "@vxv/raid-data";
import { renderDungeonData } from "./dungeonData.ts";
import type { OutputFile } from "./outputFile.ts";
import { renderRaidData } from "./raidData.ts";
import { renderSeedSql } from "./seedSql.ts";

/** Every generated file, by path from the repository: the addon's raids' and dungeons' data, the database script. */
export function generate(raids: readonly Raid[], dungeons: readonly Dungeon[]): OutputFile[] {
  return [renderRaidData(raids), renderDungeonData(dungeons), renderSeedSql(raids)];
}
