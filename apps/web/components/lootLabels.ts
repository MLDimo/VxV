import type { LootMethod } from "@vxv/server";

export const LOOT_METHOD_LABELS: Record<LootMethod, string> = {
  soft_reserve: "SR",
  soft_reserve_plus: "SR+",
  free_roll: "Roll libre",
  loot_council: "Loot council",
};
