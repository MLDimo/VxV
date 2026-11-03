import { readdir, readFile } from "node:fs/promises";
import { parseRaids, type RaidSource } from "./parseRaids.ts";
import type { Raid } from "./schema.ts";

/** The data/raids directory of the repository: adding a raid means adding one JSON file here. */
export const RAIDS_DIRECTORY = new URL("../../../data/raids/", import.meta.url);

/** The JSON files of a data directory, by name. */
export async function readDataFiles(directory: URL): Promise<RaidSource[]> {
  const fileNames = (await readdir(directory)).filter((fileName) => fileName.endsWith(".json"));
  return Promise.all(
    fileNames.map(async (fileName) => ({ fileName, content: await readFile(new URL(fileName, directory), "utf8") })),
  );
}

/** Reads and validates every JSON file of the directory. */
export async function loadRaids(directory: URL = RAIDS_DIRECTORY): Promise<Raid[]> {
  return parseRaids(await readDataFiles(directory));
}
