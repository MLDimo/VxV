import { rm } from "node:fs/promises";
import { loadRaids } from "@vxv/raid-data";
import { generate } from "./generate.ts";
import { writeOutputFiles } from "./outputFile.ts";

const REPOSITORY = new URL("../../../", import.meta.url);
/** The database script lives in dist/generated, rebuilt from scratch so that removed raids disappear. */
const GENERATED_DIRECTORY = new URL("dist/generated/", REPOSITORY);

const raids = await loadRaids();
const files = generate(raids);
await rm(GENERATED_DIRECTORY, { recursive: true, force: true });
await writeOutputFiles(REPOSITORY, files);
console.log(`${files.map((file) => file.path).join(", ")}: ${raids.length} raid(s).`);
