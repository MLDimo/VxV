import { describe, expect, it } from "vitest";
import { parseItemKinds } from "./itemKinds.ts";
import { TextFormatError } from "./textFormat.ts";

describe("the raids' items read in game", () => {
  it("reads each item's class, subclass and slot, an empty slot for an item one does not wear", () => {
    expect(parseItemKinds("VXV-OBJETS-1\nI;271095;2;15;INVTYPE_WEAPON\nI;20;15;0;\nZ;new kind")).toEqual([
      { itemId: 271095, itemClass: 2, itemSubclass: 15, equipSlot: "INVTYPE_WEAPON" },
      { itemId: 20, itemClass: 15, itemSubclass: 0, equipSlot: "" },
    ]);
  });

  it("refuses another text and an unreadable line", () => {
    expect(() => parseItemKinds("VXV-METIERS-1")).toThrow(TextFormatError);
    expect(() => parseItemKinds("VXV-OBJETS-1\nI;271095;deux;15;INVTYPE_WEAPON")).toThrow("Ligne 2 illisible.");
    expect(() => parseItemKinds("VXV-OBJETS-1\nI;271095;2;15;invtype weapon")).toThrow("Ligne 2 illisible.");
  });
});
