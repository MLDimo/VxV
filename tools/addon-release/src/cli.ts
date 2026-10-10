import { prepareRelease } from "./prepareRelease.ts";
import { releaseVersion } from "./releaseVersion.ts";

const REPOSITORY = new URL("../../../", import.meta.url);

/** The addon of the repository, VXV, its raids' data included (addon/VXV/Data). */
const SOURCE = new URL("addon/", REPOSITORY);
const TARGET = new URL("dist/release/VXV/", REPOSITORY);

const [input] = process.argv.slice(2);
if (input === undefined) {
  throw new Error("usage: npm run release:prepare -- <version, e.g. v1.2.0>");
}
const version = releaseVersion(input);
const folders = await prepareRelease({ source: SOURCE, target: TARGET, version });
console.log(`dist/release/VXV (${version}): ${folders.join(", ")}`);
