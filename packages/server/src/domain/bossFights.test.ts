import { describe, expect, it } from "vitest";
import { healingReceivedInRaid, isSameFight, parseBossFight, totalHealing } from "./bossFights.ts";
import { TextFormatError } from "./textFormat.ts";

const ENDED = 1796940000;
const FIGHT = [
  "VXV-COMBAT-1",
  `F;1084;Onyxia;9;40;${String(ENDED - 240)};${String(ENDED)}`,
  "H;Player-4619-00F6AB29;Ðéjà;85",
  "H;Player-4613-00B8484E;Thom;66",
  "H;Player-4613-00B84999;Sira;40",
].join("\n");

describe("the bosses killed read in the combat log", () => {
  it("reads a companion's record of a fight, and refuses another text", () => {
    const fight = parseBossFight(FIGHT);
    expect(fight).toMatchObject({ encounterId: 1084, name: "Onyxia", difficulty: 9, groupSize: 40 });
    expect(fight.endedAt).toEqual(new Date(ENDED * 1000));
    expect(totalHealing(fight)).toBe(191);
    expect(() => parseBossFight("VXV-LOG-2\nR;e1;;")).toThrow(TextFormatError);
    expect(() => parseBossFight("VXV-COMBAT-1\nH;g;Ðéjà;1")).toThrow(/ligne F manquante/);
  });

  it("matches a raid's kill within minutes, the players clocks being off", () => {
    const fight = parseBossFight(FIGHT);
    expect(isSameFight(fight, { encounterId: 1084, endedAt: new Date((ENDED + 120) * 1000) })).toBe(true);
    expect(isSameFight(fight, { encounterId: 1084, endedAt: new Date((ENDED + 3600) * 1000) })).toBe(false);
    expect(isSameFight(fight, { encounterId: 1085, endedAt: fight.endedAt })).toBe(false);
  });

  it("gives the healing received to the players present, by first name, unless two share it", () => {
    const log = {
      kills: [{ encounterId: 1084, killedAt: new Date((ENDED + 30) * 1000) }],
      present: ["Ðéjà Vu", "Thom Leboss", "Sira Ventargent", "Sira Lune"],
    };
    expect(healingReceivedInRaid(log, [parseBossFight(FIGHT)])).toEqual([
      { name: "Ðéjà Vu", amount: 85 },
      { name: "Thom Leboss", amount: 66 },
    ]);
    expect(healingReceivedInRaid({ ...log, kills: [] }, [parseBossFight(FIGHT)])).toEqual([]);
  });
});
