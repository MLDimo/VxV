import type { BoardItem } from "@vxv/server";
import { describe, expect, it } from "vitest";
import { groupByBoss } from "./softReserveGroups";

const item = (itemId: number, raidName: string, bossName: string): BoardItem => ({
  itemId,
  name: `Objet ${itemId}`,
  raidName,
  bossName,
  kind: undefined,
  reservedBy: [],
  alreadyOwnedBy: 0,
  excluded: false,
  mine: false,
});

describe("groupByBoss", () => {
  it("groups consecutive items of the same boss, raid by raid", () => {
    const groups = groupByBoss([item(1, "Onyxia", "Onyxia"), item(2, "Onyxia", "Onyxia"), item(3, "Hyjal", "Rage")]);
    expect(groups.map((group) => [group.raidName, group.bossName, group.items.length])).toEqual([
      ["Onyxia", "Onyxia", 2],
      ["Hyjal", "Rage", 1],
    ]);
  });

  it("keeps two bosses of the same name in different raids apart", () => {
    expect(groupByBoss([item(1, "A", "Boss"), item(2, "B", "Boss")])).toHaveLength(2);
  });
});
