import { LOOT_METHODS, SOFT_RESERVE_METHODS, type LootRecord } from "../domain/history.ts";
import type { UnitOfWork } from "./ports.ts";

export const HISTORY_SIZE = 200;

export function createHistory({ unitOfWork }: { unitOfWork: UnitOfWork }) {
  return {
    /** Loots of previous raids, readable by every member: all of them, or only those given by soft reserve. */
    listLoots({ softReserveOnly }: { softReserveOnly: boolean }): Promise<LootRecord[]> {
      const methods = softReserveOnly ? SOFT_RESERVE_METHODS : LOOT_METHODS;
      return unitOfWork.run(({ lootHistory }) => lootHistory.list(HISTORY_SIZE, methods));
    },
  };
}
