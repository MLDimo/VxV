import { describe, expect, it } from "vitest";
import { ONYXIA_PACK, startRaid } from "./fixtures.ts";

const STATE = "return { CombatLogging, CVars.advancedCombatLogging or false }";

describe("the game's combat log in the raids (phase 0, T11)", () => {
  it("is switched on with its advanced mode in a raid's instance, and off when the player leaves it", () => {
    const { client, errors } = startRaid();
    client(ONYXIA_PACK);
    client("AdvanceTime(5)");
    expect(client(STATE)).toEqual([false, false]);
    client("Instance.id = 249 AdvanceTime(5)");
    expect(client(STATE)).toEqual([true, "1"]);
    client("Instance.id = 1 AdvanceTime(5)");
    expect(client(STATE)).toEqual([false, "1"]);
    expect(errors()).toEqual([]);
  });

  it("stays on when the player had switched it on, as for Warcraft Logs", () => {
    const { client } = startRaid();
    client(`${ONYXIA_PACK} CombatLogging = true Instance.id = 249 AdvanceTime(5) Instance.id = 1 AdvanceTime(5)`);
    expect(client("return CombatLogging")).toBe(true);
  });

  it("remembers it switched the log on, to switch it off after a /reload in the raid", () => {
    const { client } = startRaid();
    client(`${ONYXIA_PACK} Instance.id = 249 AdvanceTime(5)`);
    const saved = client("return VXV_DB.modules.raid.combatLogging");
    expect(saved).toBe(true);
  });
});
