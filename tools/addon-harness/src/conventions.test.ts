import { basename } from "node:path";
import { describe, expect, it } from "vitest";
import { addonDirectories, sourceProblems } from "./conventions.ts";

describe("Lua conventions", () => {
  it.each(addonDirectories().map((directory) => [basename(directory), directory]))(
    "%s: Lua 5.1 syntax, and lines within the limit of .luacheckrc",
    (_, directory) => {
      expect(sourceProblems(directory)).toEqual([]);
    },
  );
});
