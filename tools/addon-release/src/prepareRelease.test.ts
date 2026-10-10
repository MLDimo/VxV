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

  async function addAddon(name: string): Promise<void> {
    await addFile(`addon/${name}/${name}.toc`, `## Version: ${VERSION_PLACEHOLDER}\nData.lua\n`);
    await addFile(`addon/${name}/Data.lua`, `local VERSION = "${VERSION_PLACEHOLDER}"\n`);
  }

  function release(): Promise<string[]> {
    return prepareRelease({ source: new URL("addon/", root), target: new URL("release/", root), version: "1.2.0" });
  }

  const read = (path: string) => readFile(new URL(path, root), "utf8");

  it("copies every addon folder and returns their names", async () => {
    await addAddon("VXV");
    await addAddon("Other");
    expect(await release()).toEqual(["Other", "VXV"]);
    expect((await readdir(new URL("release/", root))).sort()).toEqual(["Other", "VXV"]);
  });

  it("stamps the version in .toc and .lua files", async () => {
    await addAddon("VXV");
    await release();
    expect(await read("release/VXV/VXV.toc")).toBe("## Version: 1.2.0\nData.lua\n");
    expect(await read("release/VXV/Data.lua")).toBe('local VERSION = "1.2.0"\n');
  });

  it("copies nested files and leaves other files unchanged", async () => {
    await addAddon("VXV");
    await addFile("addon/VXV/Media/readme.txt", VERSION_PLACEHOLDER);
    await release();
    expect(await read("release/VXV/Media/readme.txt")).toBe(VERSION_PLACEHOLDER);
  });

  it("empties the release directory first", async () => {
    await addAddon("VXV");
    await addFile("release/Removed/Removed.toc", "");
    await release();
    expect(await readdir(new URL("release/", root))).toEqual(["VXV"]);
  });

  it("rejects a folder without a .toc of the same name", async () => {
    await addFile("addon/Notes/readme.txt", "");
    await expect(release()).rejects.toThrow(/Notes is not an addon folder/);
  });

  it("explains a missing source", async () => {
    await expect(release()).rejects.toThrow(/addon\/ does not exist/);
  });

  it("refuses an empty release", async () => {
    await mkdir(new URL("addon/", root));
    await expect(release()).rejects.toThrow(/nothing to release/);
  });
});
