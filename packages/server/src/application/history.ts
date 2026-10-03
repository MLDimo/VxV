import type { SoftReservedLoot } from "../domain/history.ts";
import type { UnitOfWork } from "./ports.ts";

export const HISTORY_SIZE = 200;

export function createHistory({ unitOfWork }: { unitOfWork: UnitOfWork }) {
  return {
    /** Who received the soft-reserved items of previous raids, readable by every member. */
    listSoftReservedLoots(): Promise<SoftReservedLoot[]> {
      return unitOfWork.run(({ lootHistory }) => lootHistory.listSoftReserved(HISTORY_SIZE));
    },
  };
}
