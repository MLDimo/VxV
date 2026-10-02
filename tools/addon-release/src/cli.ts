import { prepareRelease } from "./prepareRelease.ts";
import { releaseVersion } from "./releaseVersion.ts";

const REPOSITORY = new URL("../../../", import.meta.url);

/** Addon bundle sources. Hand-written bundles (addon/) will join the generated packs in P4. */
const SOURCES = [new URL("dist/generated/addon/", REPOSITORY)];
const TARGET = new URL("dist/release/VXV/", REPOSITORY);

const [input] = process.argv.slice(2);
if (input === undefined) {
  throw new Error("usage: npm run release:prepare -- <version, e.g. v1.2.0>");
}
const version = releaseVersion(input);
const folders = await prepareRelease({ sources: SOURCES, target: TARGET, version });
console.log(`dist/release/VXV (${version}): ${folders.join(", ")}`);
