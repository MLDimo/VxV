import { describe, expect, it } from "vitest";
import { loadRaids } from "./loadRaids.ts";

describe("data/raids", () => {
  it("contains only valid raid files, none until the raids open", async () => {
    await expect(loadRaids()).resolves.toBeInstanceOf(Array);
  });
});
