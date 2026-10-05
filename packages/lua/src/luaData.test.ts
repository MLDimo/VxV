import { describe, expect, it } from "vitest";
import { LuaDataError, readLuaData } from "./luaData.ts";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("readLuaData", () => {
  it("reads the SavedVariables the game writes, accents and escapes included", () => {
    const file = [
      "",
      "VXV_SyncDB = {",
      '\t["version"] = 1,',
      '\t["roster"] = {',
      '\t\t["text"] = "VXV-ROSTER-1\\nÐéjà;Vu;ROGUE\\nThom;Leboss;PRIEST",',
      '\t\t["capturedAt"] = 1796903000,',
      "\t},",
      '\t["characters"] = {',
      '\t\t["Ðéjà Vu"] = { ["race"] = "Scourge", ["sex"] = 3 },',
      "\t},",
      '\t["quote"] = "a \\"b\\" \\\\ \\226\\130\\172",',
      "}",
      "VXV_Other = -2.5",
      "",
    ].join("\n");
    expect(readLuaData(bytes(file))).toEqual({
      VXV_SyncDB: {
        version: 1,
        roster: { text: "VXV-ROSTER-1\nÐéjà;Vu;ROGUE\nThom;Leboss;PRIEST", capturedAt: 1796903000 },
        characters: { "Ðéjà Vu": { race: "Scourge", sex: 3 } },
        quote: 'a "b" \\ €',
      },
      VXV_Other: -2.5,
    });
  });

  it("keys list items by their position, and leaves out nil values", () => {
    expect(readLuaData(bytes('List = { "a", nil, "b", [10] = true, flag = false }'))).toEqual({
      List: { "1": "a", "3": "b", "10": true, flag: false },
    });
  });

  it("never runs anything: calls, variables and functions are refused", () => {
    for (const code of ['os.execute("rm -rf /")', "X = os.time()", "X = Y", "X = function() end", "local X = 1"]) {
      expect(() => readLuaData(bytes(code))).toThrow(LuaDataError);
    }
  });

  it("refuses a damaged file", () => {
    expect(() => readLuaData(bytes("VXV_SyncDB = { "))).toThrow(LuaDataError);
  });
});
