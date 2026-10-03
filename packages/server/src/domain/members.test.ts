import { describe, expect, it } from "vitest";
import { rolesFromDiscordRoles, type DiscordRoleMapping } from "./members.ts";

const mapping: DiscordRoleMapping = { member: "m", treasurer: "t", officer: "o", gm: "g" };

describe("rolesFromDiscordRoles", () => {
  it.each([
    [["m"], ["member"]],
    [
      ["m", "o"],
      ["member", "officer"],
    ],
    [
      ["o", "t", "m"],
      ["member", "treasurer", "officer"],
    ],
    [["g"], ["gm"]],
    [
      ["other", "m", "g"],
      ["member", "gm"],
    ],
  ])("gives every guild role among %j, in rank order: %j", (roles, expected) => {
    expect(rolesFromDiscordRoles(roles, mapping)).toEqual(expected);
  });

  it("gives no role to a Discord user outside the guild", () => {
    expect(rolesFromDiscordRoles(["unrelated"], mapping)).toEqual([]);
    expect(rolesFromDiscordRoles([], mapping)).toEqual([]);
  });
});
