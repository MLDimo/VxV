import { describe, expect, it } from "vitest";
import { bossFightKey, createCombatLogReader, formatBossFight, parseCombatLine } from "./combatLog.ts";

/** Lines as the game wrote them on 7 October (phase 0, T11), around a boss fight. */
const DEJA = 'Player-4619-00F6AB29,"Ðéjà-ClassicBetaPvP-",0x511,0x80000000';
const MURAN = 'Player-4613-00B8484E,"Muran-ClassicBetaPvP2-",0x518,0x80000000';
const ADVANCED =
  "Player-4619-00F6AB29,0000000000000000,403,403,159,0,351,0,0,0,3,100,100,0,-8958.68,556.70,1453,3.0170,7";
const LOG = [
  "10/7/2026 21:00:00.0000  COMBAT_LOG_VERSION,22,ADVANCED_LOG_ENABLED,1,BUILD_VERSION,1.60.1,PROJECT_ID,18",
  `10/7/2026 21:00:01.0000  SPELL_HEAL,${DEJA},${DEJA},2052,"Soins inférieurs",0x2,${ADVANCED},80,80,0,0,nil`,
  '10/7/2026 21:00:05.1234  ENCOUNTER_START,1084,"Onyxia",9,40,249',
  `10/7/2026 21:00:10.0000  SPELL_HEAL,${MURAN},${DEJA},2052,"Soins inférieurs",0x2,${ADVANCED},83,83,20,0,nil`,
  `10/7/2026 21:00:12.0000  SPELL_PERIODIC_HEAL,${DEJA},${MURAN},746,"Premiers soins",0x1,${ADVANCED},66,66,0,0,nil`,
  `10/7/2026 21:00:13.0000  SPELL_HEAL,${MURAN},${DEJA},439,"Potion de soins",0x1,${ADVANCED},86,86,64,0,nil`,
  `10/7/2026 21:00:14.0000  SPELL_DAMAGE,${DEJA},Creature-0-4615-0-24798-157-0000463CBA,"Onyxia",0x10a48,0x80000000,1,"Attaque",0x1,${ADVANCED},12,12,0,1,0,0,0,nil,nil,nil`,
  '10/7/2026 21:04:05.0000  ENCOUNTER_END,1084,"Onyxia",9,40,1,240000',
];
const at = (hour: number, minute: number, second: number) =>
  Math.floor(new Date(2026, 9, 7, hour, minute, second).getTime() / 1000);

function readAll(lines: readonly string[]) {
  const reader = createCombatLogReader();
  return lines.flatMap((line) => reader.read(line) ?? []);
}

describe("the game's combat log (T11)", () => {
  it("reads a line's time on the player's clock and its fields, quotes aside", () => {
    expect(parseCombatLine('10/7/2026 21:00:05.1234  ENCOUNTER_START,1084,"Onyxia, la reine",9,40,249')).toEqual({
      at: at(21, 0, 5),
      event: "ENCOUNTER_START",
      fields: ["1084", "Onyxia, la reine", "9", "40", "249"],
    });
    expect(parseCombatLine("pas une ligne du journal")).toBeUndefined();
  });

  it("gives each boss killed with the effective healing each player received during its fight", () => {
    const [fight] = readAll(LOG);
    expect(fight).toMatchObject({
      encounterId: 1084,
      name: "Onyxia",
      difficulty: 9,
      groupSize: 40,
      startedAt: at(21, 0, 5),
      endedAt: at(21, 4, 5),
    });
    // Before the pull and overhealing aside: Ðéjà 63 + 22, Muran 66.
    expect(Object.fromEntries(fight?.healingReceived ?? [])).toEqual({
      "Player-4619-00F6AB29": { name: "Ðéjà", amount: 85 },
      "Player-4613-00B8484E": { name: "Muran", amount: 66 },
    });
    expect(fight && bossFightKey(fight)).toBe(`1084-${String(at(21, 4, 5))}`);
    expect(fight && formatBossFight(fight)).toBe(
      [
        "VXV-COMBAT-1",
        `F;1084;Onyxia;9;40;${String(at(21, 0, 5))};${String(at(21, 4, 5))}`,
        "H;Player-4619-00F6AB29;Ðéjà;85",
        "H;Player-4613-00B8484E;Muran;66",
      ].join("\n"),
    );
  });

  it("keeps nothing of a wipe, and counts heals only in the advanced mode", () => {
    expect(readAll(LOG.map((line) => line.replace(",9,40,1,240000", ",9,40,0,240000")))).toEqual([]);
    const [fight] = readAll(LOG.map((line) => line.replace("ADVANCED_LOG_ENABLED,1", "ADVANCED_LOG_ENABLED,0")));
    expect(fight?.healingReceived.size).toBe(0);
  });
});
