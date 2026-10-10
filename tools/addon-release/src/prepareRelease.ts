import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { extname } from "node:path";

/** Placeholder written in .toc and .lua files, replaced by the release version. */
export const VERSION_PLACEHOLDER = "@project-version@";

const STAMPED_EXTENSIONS = new Set([".toc", ".lua"]);

interface ReleaseOptions {
  /** Directory whose sub-folders are addons (each holding a .toc of the same name). */
  source: URL;
  /** Release directory, emptied first; its content becomes the root of the archive. */
  target: URL;
  version: string;
}

async function exists(location: URL): Promise<boolean> {
  return stat(location).then(
    () => true,
    () => false,
  );
}

async function copyStamped(from: URL, to: URL, version: string): Promise<void> {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      await copyStamped(new URL(`${entry.name}/`, from), new URL(`${entry.name}/`, to), version);
    } else if (STAMPED_EXTENSIONS.has(extname(entry.name))) {
      const content = await readFile(new URL(entry.name, from), "utf8");
      await writeFile(new URL(entry.name, to), content.replaceAll(VERSION_PLACEHOLDER, version), "utf8");
    } else {
      await copyFile(new URL(entry.name, from), new URL(entry.name, to));
    }
  }
}

async function addonFolders(source: URL): Promise<string[]> {
  if (!(await exists(source))) {
    throw new Error(`${source.pathname} does not exist`);
  }
  const folders = (await readdir(source, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  for (const folder of folders) {
    if (!(await exists(new URL(`${folder.name}/${folder.name}.toc`, source)))) {
      throw new Error(`${folder.name} is not an addon folder: ${folder.name}.toc is missing`);
    }
  }
  return folders.map((folder) => folder.name);
}

/** Copies every addon into the release directory with its version stamped; returns the addon names. */
export async function prepareRelease({ source, target, version }: ReleaseOptions): Promise<string[]> {
  await rm(target, { recursive: true, force: true });
  const folders = await addonFolders(source);
  if (folders.length === 0) {
    throw new Error("nothing to release: no addon folder found");
  }
  for (const folder of folders) {
    await copyStamped(new URL(`${folder}/`, source), new URL(`${folder}/`, target), version);
  }
  return folders.sort();
}
