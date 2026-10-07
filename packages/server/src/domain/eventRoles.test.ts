import { describe, expect, it } from "vitest";
import {
  eventAudience,
  eventRoleChoices,
  eventRoleRefusal,
  reservedRole,
  type EventRole,
  type ServerRole,
} from "./eventRoles.ts";

const role = (id: string, name: string, flags: Partial<ServerRole> = {}): ServerRole => ({
  id,
  name,
  everyone: false,
  managed: false,
  ...flags,
});
const RAIDER_1: EventRole = { id: "1194373648929263676", name: "Raideur R1" };

describe("eventRoleChoices", () => {
  it("offers everybody first, then the server's roles by name, without those Discord or VXV gives", () => {
    const choices = eventRoleChoices([
      role("r2", "Raideur R2"),
      role("bot", "VXV", { managed: true }),
      role("guild", "@everyone", { everyone: true }),
      role("officer", "Officier"),
      role("class", "Démoniste"),
      role("title", "◆ Roi du gambling"),
      role(RAIDER_1.id, RAIDER_1.name),
      role("elves", "élite"),
    ]);
    expect(choices).toEqual([
      { id: "guild", name: "Tout le monde", everyone: true },
      { id: "elves", name: "élite", everyone: false },
      { id: "officer", name: "Officier", everyone: false },
      { id: RAIDER_1.id, name: "Raideur R1", everyone: false },
      { id: "r2", name: "Raideur R2", everyone: false },
    ]);
  });
});

describe("reservedRole", () => {
  it("reserves the event to the role chosen, to nobody in particular for everybody", () => {
    expect(reservedRole({ ...RAIDER_1, everyone: false })).toEqual(RAIDER_1);
    expect(reservedRole({ id: "guild", name: "Tout le monde", everyone: true })).toBeUndefined();
  });
});

describe("eventAudience", () => {
  it("says who may sign up", () => {
    expect(eventAudience(RAIDER_1)).toBe("Réservé à Raideur R1");
    expect(eventAudience(undefined)).toBe("Ouvert à tous");
  });
});

describe("eventRoleRefusal", () => {
  it("lets the role's holders sign up", () => {
    expect(eventRoleRefusal(RAIDER_1, ["class", RAIDER_1.id])).toBeUndefined();
  });

  it.each([
    ["a member without the role", ["class"]],
    ["a member who left the server", undefined],
  ])("refuses %s", (_case, held) => {
    expect(eventRoleRefusal(RAIDER_1, held)).toBe("Ce raid est réservé au rôle Discord « Raideur R1 ».");
  });
});
