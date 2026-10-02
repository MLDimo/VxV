import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prepareRelease, VERSION_PLACEHOLDER } from "./prepareRelease.ts";

describe("prepareRelease", () => {
  let root: URL;

  beforeEach(async () => {
    root = pathToFileURL(`${await mkdtemp(`${tmpdir()}/vxv-release-`)}/`);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function addFile(path: string, content: string): Promise<void> {
    const file = new URL(path, root);
    await mkdir(new URL(".", file), { recursive: true });
    await writeFile(file, content, "utf8");
  }

  async function addAddon(source: string, name: string): Promise<void> {
    await addFile(`${source}/${name}/${name}.toc`, `## Version: ${VERSION_PLACEHOLDER}\nData.lua\n`);
    await addFile(`${source}/${name}/Data.lua`, `local VERSION = "${VERSION_PLACEHOLDER}"\n`);
  }

  function release(...sources: string[]): Promise<string[]> {
    return prepareRelease({
      sources: sources.map((source) => new URL(`${source}/`, root)),
      target: new URL("release/", root),
      version: "1.2.0",
    });
  }

  const read = (path: string) => readFile(new URL(path, root), "utf8");

  it("copies every addon folder of every source and returns their names", async () => {
    await addAddon("generated", "VXV_Data_Onyxia");
    await addAddon("handwritten", "VXV_Core");
    expect(await release("generated", "handwritten")).toEqual(["VXV_Core", "VXV_Data_Onyxia"]);
    expect((await readdir(new URL("release/", root))).sort()).toEqual(["VXV_Core", "VXV_Data_Onyxia"]);
  });

  it("stamps the version in .toc and .lua files", async () => {
    await addAddon("generated", "VXV_Data_Onyxia");
    await release("generated");
    expect(await read("release/VXV_Data_Onyxia/VXV_Data_Onyxia.toc")).toBe("## Version: 1.2.0\nData.lua\n");
    expect(await read("release/VXV_Data_Onyxia/Data.lua")).toBe('local VERSION = "1.2.0"\n');
  });

  it("copies nested files and leaves other files unchanged", async () => {
    await addAddon("generated", "VXV_Core");
    await addFile("generated/VXV_Core/Media/readme.txt", VERSION_PLACEHOLDER);
    await release("generated");
    expect(await read("release/VXV_Core/Media/readme.txt")).toBe(VERSION_PLACEHOLDER);
  });

  it("empties the release directory first", async () => {
    await addAddon("generated", "VXV_Data_Onyxia");
    await addFile("release/VXV_Data_Removed/VXV_Data_Removed.toc", "");
    await release("generated");
    expect(await readdir(new URL("release/", root))).toEqual(["VXV_Data_Onyxia"]);
  });

  it("rejects a folder without a .toc of the same name", async () => {
    await addFile("generated/Notes/readme.txt", "");
    await expect(release("generated")).rejects.toThrow(/Notes is not an addon folder/);
  });

  it("rejects a bundle provided by two sources", async () => {
    await addAddon("generated", "VXV_Core");
    await addAddon("handwritten", "VXV_Core");
    await expect(release("generated", "handwritten")).rejects.toThrow(/VXV_Core is provided twice/);
  });

  it("explains a missing source", async () => {
    await expect(release("generated")).rejects.toThrow(/run npm run generate first/);
  });

  it("refuses an empty release", async () => {
    await mkdir(new URL("generated/", root));
    await expect(release("generated")).rejects.toThrow(/nothing to release/);
  });
});
