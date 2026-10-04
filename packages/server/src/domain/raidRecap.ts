import type { RaidEvent } from "./events.ts";
import type { LootMethod } from "./history.ts";
import type { RaidLog } from "./raidLog.ts";

/** The end-of-raid recap the bot publishes on Discord (plan 6.10). */
export interface RaidRecap {
  event: RaidEvent;
  /** Bosses killed, in kill order. */
  kills: string[];
  /** From the first pull to the last kill, when the log knows both. */
  durationMs: number | undefined;
  loots: { itemName: string; winnerName: string; method: LootMethod }[];
  /** Most deaths first. */
  deaths: { name: string; count: number }[];
}

/** The recap of a raid's log; bosses and items are named from the raid data, unknown ones are left out. */
export function buildRaidRecap(
  event: RaidEvent,
  log: RaidLog,
  names: { bosses: ReadonlyMap<number, string>; items: ReadonlyMap<number, string> },
): RaidRecap {
  const start = log.startedAt?.getTime();
  const end = log.endedAt?.getTime();
  return {
    event,
    kills: log.kills.flatMap((kill) => names.bosses.get(kill.encounterId) ?? []),
    durationMs: start !== undefined && end !== undefined ? end - start : undefined,
    loots: log.loots.flatMap((loot) => {
      const itemName = names.items.get(loot.itemId);
      return itemName === undefined ? [] : [{ itemName, winnerName: loot.winner, method: loot.method }];
    }),
    deaths: [...log.deaths].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)),
  };
}
