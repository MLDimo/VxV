import { describe, expect, it } from "vitest";
import type { Character } from "./characters.ts";
import { checkSignup, composition, type Signup } from "./signups.ts";

const now = new Date("2026-12-01T12:00:00Z");
const startsAt = new Date("2026-12-10T20:00:00Z");
const deja: Character = {
  id: "deja",
  firstName: "Ðéjà",
  lastName: "Vu",
  characterClass: "ROGUE",
  memberId: "me",
  isMain: true,
  inGuild: true,
};
const choice = { characterId: "deja", role: "dps", spec: "Combat", status: "present" };

function refusalOf(...args: Parameters<typeof checkSignup>): string | undefined {
  const check = checkSignup(...args);
  return check.valid ? undefined : check.refusal;
}

describe("checkSignup", () => {
  it("accepts a valid choice with one of the member's characters, spec trimmed", () => {
    expect(checkSignup({ ...choice, spec: " Combat " }, [deja], startsAt, now)).toEqual({
      valid: true,
      choice: { characterId: "deja", role: "dps", spec: "Combat", status: "present" },
    });
  });

  it.each([
    ["a started raid", {}, [deja], startsAt, /commencé/],
    ["someone else's character", { characterId: "other" }, [deja], now, /vos personnages/],
    ["an unknown role", { role: "support" }, [deja], now, /rôle/],
    ["an empty spec", { spec: "  " }, [deja], now, /spécialisation/],
    ["a too long spec", { spec: "x".repeat(31) }, [deja], now, /spécialisation/],
    ["an unknown status", { status: "sure" }, [deja], now, /statut/],
  ])("refuses %s", (_case, change, characters, instant, message) => {
    expect(refusalOf({ ...choice, ...change }, characters, startsAt, instant)).toMatch(message);
  });

  it("refuses a character that left the guild", () => {
    expect(refusalOf(choice, [{ ...deja, inGuild: false }], startsAt, now)).toMatch(/plus partie de la guilde/);
  });
});

describe("composition", () => {
  const signup = (role: Signup["role"], status: Signup["status"], characterClass: string): Signup => ({
    eventId: "e",
    memberId: `${role}-${status}-${characterClass}`,
    characterId: "c",
    characterName: "Nom",
    characterClass,
    role,
    spec: "Spé",
    status,
  });

  it("counts expected players by role and class, and everyone by status", () => {
    const result = composition([
      signup("tank", "present", "WARRIOR"),
      signup("healer", "late", "PRIEST"),
      signup("dps", "present", "ROGUE"),
      signup("dps", "maybe", "MAGE"),
      signup("dps", "bench", "ROGUE"),
      signup("healer", "absent", "DRUID"),
    ]);
    expect(result.byRole).toEqual({ tank: 1, healer: 1, dps: 1 });
    expect(result.byClass).toEqual({ WARRIOR: 1, PRIEST: 1, ROGUE: 1 });
    expect(result.byStatus).toEqual({ present: 2, maybe: 1, late: 1, bench: 1, absent: 1 });
  });
});
