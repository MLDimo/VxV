import { parseItemKinds } from "../domain/itemKinds.ts";
import type { UnitOfWork } from "./ports.ts";

/** The raids' items as the members' addons read them in game: what the game says of each, who may equip it. */
export function createItems({ unitOfWork }: { unitOfWork: UnitOfWork }) {
  return {
    /**
     * Keeps what the game says of the raids' items (VXV-OBJETS texts): any member's addon reads the same, so an item
     * keeps its first reading, and items the raids do not drop are left aside. Returns how many items were new.
     */
    recordKindsFromGame(texts: readonly string[]): Promise<number> {
      const readings = texts.flatMap(parseItemKinds);
      return unitOfWork.run(({ items }) => items.saveKinds(readings));
    },
  };
}
