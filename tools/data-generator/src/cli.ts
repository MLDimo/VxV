import { rm } from "node:fs/promises";
import { loadRaids } from "@vxv/raid-data";
import { generate } from "./generate.ts";
import { writeOutputFiles } from "./outputFile.ts";

/** Generated files live in dist/generated, rebuilt from scratch so that removed raids disappear. */
const OUTPUT_DIRECTORY = new URL("../../../dist/generated/", import.meta.url);

const raids = await loadRaids();
const files = generate(raids);
await rm(OUTPUT_DIRECTORY, { recursive: true, force: true });
await writeOutputFiles(OUTPUT_DIRECTORY, files);
console.log(`dist/generated: ${files.length} files for ${raids.length} raid(s).`);
