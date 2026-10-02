import { describe, expect, it } from "vitest";
import { releaseVersion } from "./releaseVersion.ts";

describe("releaseVersion", () => {
  it.each([
    ["v1.2.0", "1.2.0"],
    ["1.2.0", "1.2.0"],
    ["v0.1.0-beta.2", "0.1.0-beta.2"],
    ["0.0.0-dev.42", "0.0.0-dev.42"],
  ])("reads %s as %s", (input, version) => {
    expect(releaseVersion(input)).toBe(version);
  });

  it.each(["", "v", "v1.2", "release-1.2.0", "v1.2.0 "])("rejects %j", (input) => {
    expect(() => releaseVersion(input)).toThrow(/not a release version/);
  });
});
