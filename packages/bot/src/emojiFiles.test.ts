import { stat } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { emojiFiles } from "./emojiFiles.ts";
import { EMOJI_IDS } from "./emojiIds.ts";

// What Discord accepts for an application emoji.
const NAME = /^[a-z0-9_]{2,32}$/;
const MAX_BYTES = 256 * 1024;

describe("the bot's emojis", () => {
  it("are images Discord accepts, each under its own name", async () => {
    const files = await emojiFiles();
    const names = files.map((file) => file.name);
    expect(files.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
    expect(names.filter((name) => !NAME.test(name))).toEqual([]);
    for (const file of files) {
      expect((await stat(file.path)).size, file.name).toBeLessThanOrEqual(MAX_BYTES);
    }
  });

  it("each have their image, when the bot writes them", async () => {
    const names = new Set((await emojiFiles()).map((file) => file.name));
    expect(Object.keys(EMOJI_IDS).filter((name) => !names.has(name))).toEqual([]);
  });
});
