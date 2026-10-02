import type { Raid } from "@vxv/raid-data";
import { renderLuaPack } from "./luaPack.ts";
import type { OutputFile } from "./outputFile.ts";
import { renderSeedSql } from "./seedSql.ts";

/** Every generated file: one addon data pack per raid and the database sync script. */
export function generate(raids: readonly Raid[]): OutputFile[] {
  return [...raids.flatMap(renderLuaPack), renderSeedSql(raids)];
}
