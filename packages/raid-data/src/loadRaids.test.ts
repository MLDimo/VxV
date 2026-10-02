import { describe, expect, it } from "vitest";
import { loadRaids } from "./loadRaids.ts";

describe("data/raids", () => {
  it("contains only valid raid files", async () => {
    const raids = await loadRaids();
    expect(raids.length).toBeGreaterThan(0);
  });
});
