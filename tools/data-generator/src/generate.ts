import type { Raid } from "@vxv/raid-data";
import type { OutputFile } from "./outputFile.ts";
import { renderRaidData } from "./raidData.ts";
import { renderSeedSql } from "./seedSql.ts";

/** Every generated file, by path from the repository: the addon's raids' data and the database sync script. */
export function generate(raids: readonly Raid[]): OutputFile[] {
  return [renderRaidData(raids), renderSeedSql(raids)];
}
