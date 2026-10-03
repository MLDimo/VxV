import { describe, expect, it } from "vitest";
import { SLASH_COMMANDS } from "./commandList.ts";

// Limits Discord enforces when the commands are registered.
const NAME = /^[-_\p{Ll}\p{N}]{1,32}$/u;
const MAX_DESCRIPTION = 100;
const MAX_OPTIONS = 25;

describe("slash command definitions", () => {
  it("have unique, valid names", () => {
    const names = SLASH_COMMANDS.map((command) => command.definition.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.filter((name) => !NAME.test(name))).toEqual([]);
  });

  it.each(SLASH_COMMANDS.map((command) => [command.definition.name, command.definition] as const))(
    "/%s respects Discord's limits",
    (_, definition) => {
      expect(definition.description.length).toBeGreaterThan(0);
      expect(definition.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
      const options = definition.options ?? [];
      expect(options.length).toBeLessThanOrEqual(MAX_OPTIONS);
      for (const option of options) {
        expect(option.name).toMatch(NAME);
        expect(option.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
      }
    },
  );
});
