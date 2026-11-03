import { z } from "zod";
import { readDataFiles } from "./loadRaids.ts";
import { duplicates, parseDataFile, RaidDataError, type RaidSource } from "./parseRaids.ts";

/** The data/dungeons directory of the repository: adding a dungeon means adding one JSON file here. */
export const DUNGEONS_DIRECTORY = new URL("../../../data/dungeons/", import.meta.url);

const positiveId = z.number().int().positive();
const label = z.string().trim().min(1);

/** Content of one data/dungeons/<id>.json file: the dungeon counts as done once its last boss is killed. */
export const dungeonFileSchema = z.strictObject({
  name: label,
  instanceId: positiveId,
  lastBoss: z.strictObject({ encounterId: positiveId, name: label }),
});

/** A validated dungeon. Its id is the file name without extension. */
export type Dungeon = z.infer<typeof dungeonFileSchema> & { id: string };

/** Validates every dungeon source and returns the dungeons sorted by id, or throws a RaidDataError. */
export function parseDungeons(sources: readonly RaidSource[]): Dungeon[] {
  const issues: string[] = [];
  const dungeons: Dungeon[] = sources.flatMap((source) => parseDataFile(source, dungeonFileSchema, issues) ?? []);
  issues.push(
    ...duplicates(dungeons.map((dungeon) => dungeon.instanceId)).map(
      (id) => `instanceId ${id} is used by several dungeons`,
    ),
  );
  if (issues.length > 0) {
    throw new RaidDataError(issues);
  }
  return dungeons.sort((left, right) => left.id.localeCompare(right.id));
}

/** Reads and validates every JSON file of the directory. */
export async function loadDungeons(directory: URL = DUNGEONS_DIRECTORY): Promise<Dungeon[]> {
  return parseDungeons(await readDataFiles(directory));
}
