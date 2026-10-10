import { parseItemKinds } from "@vxv/server/domain/itemKinds";
import { describe, expect, it } from "vitest";
import { companionFiles } from "../sync/fixtures.ts";
import { ONYXIA_PACK, startRaid, websiteText } from "./fixtures.ts";

const SENT = "return VXV_SyncDB.texts.objets and VXV_SyncDB.texts.objets.raids";

describe("the raids' items read in game", () => {
  it("keeps for the companion what the game says of each item of the packs, reading again those not cached yet", () => {
    const { client, errors } = startRaid({ written: companionFiles({ raid: websiteText() }) });
    client(`${ONYXIA_PACK}
      ItemInfo[20] = { name = "Tête d'Onyxia", classID = 15, subclassID = 0 }
      ItemInfo[40] = { name = "Bâton du dragon", classID = 2, subclassID = 10, equipLoc = "INVTYPE_2HWEAPON" }
      AdvanceTime(5)`);
    expect(parseItemKinds(client(SENT) as string)).toEqual([
      { itemId: 20, itemClass: 15, itemSubclass: 0, equipSlot: "" },
      { itemId: 40, itemClass: 2, itemSubclass: 10, equipSlot: "INVTYPE_2HWEAPON" },
    ]);
    // The client cached the cape meanwhile: the next reading has it.
    client(`ItemInfo[10] = { name = "Cape de la gardienne", classID = 4, subclassID = 1, equipLoc = "INVTYPE_CLOAK" }
      AdvanceTime(10)`);
    expect(parseItemKinds(client(SENT) as string).map((reading) => reading.itemId)).toEqual([10, 20, 40]);
    expect(errors()).toEqual([]);
  });
});
