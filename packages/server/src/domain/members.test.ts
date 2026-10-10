import { describe, expect, it } from "vitest";
import { rolesFromDiscordRoles, type DiscordRoleMapping } from "./members.ts";

const mapping: DiscordRoleMapping = { confirmed: "c", treasurer: "t", officer: "o", gm: "g" };

describe("rolesFromDiscordRoles", () => {
  it.each([
    [[], ["member"]],
    [["unrelated"], ["member"]],
    [["o"], ["member", "officer"]],
    [
      ["o", "c"],
      ["member", "confirmed", "officer"],
    ],
    [
      ["o", "t"],
      ["member", "treasurer", "officer"],
    ],
    [
      ["other", "g"],
      ["member", "gm"],
    ],
  ])("makes everybody on the server a member, plus the roles granted by %j: %j", (roles, expected) => {
    expect(rolesFromDiscordRoles(roles, mapping)).toEqual(expected);
  });
});
