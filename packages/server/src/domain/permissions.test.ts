import { describe, expect, it } from "vitest";
import type { MemberRole } from "./members.ts";
import { canManageRaids } from "./permissions.ts";

describe("canManageRaids", () => {
  it.each<[MemberRole[], boolean]>([
    [["member"], false],
    [["treasurer"], false],
    [["member", "treasurer"], false],
    [["officer"], true],
    [["gm"], true],
    [["member", "treasurer", "officer"], true],
  ])("%j: %s", (roles, allowed) => {
    expect(canManageRaids(roles)).toBe(allowed);
  });
});
