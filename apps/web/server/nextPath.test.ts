import { describe, expect, it } from "vitest";
import { safeNextPath } from "./nextPath";

describe("safeNextPath", () => {
  it("keeps a path of the website, with its query", () => {
    expect(safeNextPath("/compagnon/relier?port=53682&etat=abc")).toBe("/compagnon/relier?port=53682&etat=abc");
  });

  it("goes home instead of leaving the website", () => {
    for (const value of [
      "//evil.example",
      "/\\evil.example",
      "https://evil.example",
      "compagnon",
      "",
      null,
      undefined,
    ]) {
      expect(safeNextPath(value)).toBe("/");
    }
  });
});
