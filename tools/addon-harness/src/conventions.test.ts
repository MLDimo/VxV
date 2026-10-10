import { basename } from "node:path";
import { describe, expect, it } from "vitest";
import { ADDON_DIR } from "./core.ts";
import { addonDirectories, namespaceProblems, sourceProblems } from "./conventions.ts";

describe("Lua conventions", () => {
  it.each(addonDirectories().map((directory) => [basename(directory), directory]))(
    "%s: Lua 5.1 syntax, and lines within the limit of .luacheckrc",
    (_, directory) => {
      expect(sourceProblems(directory)).toEqual([]);
    },
  );

  it("keeps each part of VXV to its own namespace: the others only through the core's public API", () => {
    expect(namespaceProblems(ADDON_DIR)).toEqual([]);
  });
});
