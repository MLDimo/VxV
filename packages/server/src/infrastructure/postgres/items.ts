import type { ItemRepository } from "../../application/ports.ts";
import type { SqlClient } from "../sql.ts";

export function itemRepository(sql: SqlClient): ItemRepository {
  return {
    async saveKinds(readings) {
      let saved = 0;
      // One query after the other: a transaction's client runs one at a time. An item keeps its first reading.
      for (const { itemId, itemClass, itemSubclass, equipSlot } of readings) {
        const rows = await sql.query<{ id: number }>(
          `update items set item_class = $2, item_subclass = $3, equip_slot = $4
           where id = $1 and item_class is null returning id`,
          [itemId, itemClass, itemSubclass, equipSlot],
        );
        saved += rows.length;
      }
      return saved;
    },
  };
}
