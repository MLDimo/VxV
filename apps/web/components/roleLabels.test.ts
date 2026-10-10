import { describe, expect, it } from "vitest";
import { rolesLabel } from "./roleLabels";

describe("rolesLabel", () => {
  it.each([
    [["member"], "Nouveau membre"],
    [["member", "confirmed"], "Membre"],
    [["member", "officer"], "Officier"],
    [["member", "confirmed", "officer"], "Officier"],
    [["member", "treasurer", "officer"], "Officier, Trésorier"],
    [["treasurer", "gm"], "Maître de guilde, Trésorier"],
  ] as const)("%j: %s", (roles, label) => {
    expect(rolesLabel(roles)).toBe(label);
  });
});
