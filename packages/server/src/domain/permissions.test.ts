import { describe, expect, it } from "vitest";
import { canManageRaids } from "./permissions.ts";

describe("canManageRaids", () => {
  it.each([
    ["member", false],
    ["treasurer", false],
    ["officer", true],
    ["gm", true],
  ] as const)("%s: %s", (role, allowed) => {
    expect(canManageRaids(role)).toBe(allowed);
  });
});
