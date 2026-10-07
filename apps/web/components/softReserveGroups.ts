import type { BoardItem } from "@vxv/server";

interface BossGroup {
  raidName: string;
  bossName: string;
  items: BoardItem[];
}

/** Board items grouped by raid and boss, keeping the board's order (raid, then boss order). */
export function groupByBoss(items: readonly BoardItem[]): BossGroup[] {
  const groups: BossGroup[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last?.raidName === item.raidName && last.bossName === item.bossName) {
      last.items.push(item);
    } else {
      groups.push({ raidName: item.raidName, bossName: item.bossName, items: [item] });
    }
  }
  return groups;
}
