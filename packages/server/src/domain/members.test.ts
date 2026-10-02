import { describe, expect, it } from "vitest";
import { roleFromDiscordRoles, type DiscordRoleMapping } from "./members.ts";

const mapping: DiscordRoleMapping = { member: "m", treasurer: "t", officer: "o", gm: "g" };

describe("roleFromDiscordRoles", () => {
  it.each([
    [["m"], "member"],
    [["m", "t"], "treasurer"],
    [["m", "o"], "officer"],
    [["o", "t", "m"], "officer"],
    [["g"], "gm"],
    [["other", "m", "g"], "gm"],
  ])("gives the highest guild role among %j: %s", (roles, expected) => {
    expect(roleFromDiscordRoles(roles, mapping)).toBe(expected);
  });

  it("refuses a Discord user without any guild role", () => {
    expect(roleFromDiscordRoles(["unrelated"], mapping)).toBeUndefined();
    expect(roleFromDiscordRoles([], mapping)).toBeUndefined();
  });
});
