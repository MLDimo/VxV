import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { generate } from "./generate.ts";
import { writeOutputFiles } from "./outputFile.ts";
import { onyxia, salleDesThanes } from "./test/raids.ts";

describe("generate", () => {
  it("produces the addon's raids' data and the database script", () => {
    expect(generate([onyxia, salleDesThanes]).map((file) => file.path)).toEqual([
      "addon/VXV/Data/Raids.lua",
      "dist/generated/database/raid-data.sql",
    ]);
  });
});

describe("writeOutputFiles", () => {
  it("writes every file, creating the folders", async () => {
    const directory = pathToFileURL(`${await mkdtemp(`${tmpdir()}/vxv-`)}/`);
    try {
      const files = generate([onyxia]);
      await writeOutputFiles(directory, files);
      for (const file of files) {
        expect(await readFile(new URL(file.path, directory), "utf8")).toBe(file.content);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
