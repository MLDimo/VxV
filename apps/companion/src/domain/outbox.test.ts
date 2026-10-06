import { readLuaData } from "@vxv/lua";
import { describe, expect, it } from "vitest";
import { mergeOutboxes, readOutbox, textDigest } from "./outbox.ts";

/** The file the game writes for VXV_Sync's saved data, as WoW formats it. */
const SAVED = `
VXV_SyncDB = {
	["version"] = 1,
	["roster"] = {
		["text"] = "VXV-ROSTER-1\\nÐéjà;Vu;ROGUE",
		["capturedAt"] = 1796904000,
	},
	["raidLogs"] = {
		["e1"] = "VXV-LOG-1\\nR;e1;1796904000;1796904120",
	},
	["characters"] = {
		["Ðéjà Vu"] = {
			["race"] = "Scourge",
			["sex"] = 3,
		},
	},
	["changes"] = {
		["Ðéjà Vu#1796904000#42"] = {
			["id"] = "Ðéjà Vu#1796904000#42",
			["eventId"] = "e1",
			["author"] = "Ðéjà Vu",
			["at"] = 1796904000,
			["kind"] = "reserves",
			["itemIds"] = {
				20, -- [1]
				21, -- [2]
			},
		},
		["Ðéjà Vu#1796904100#7"] = {
			["id"] = "Ðéjà Vu#1796904100#7",
			["kind"] = "reserves",
			["itemIds"] = {
			},
		},
	},
	["counters"] = {
		["Ðéjà Vu|fishing"] = {
			["name"] = "Ðéjà Vu",
			["type"] = "fishing",
			["value"] = 412,
			["at"] = 1796904200,
		},
	},
	["texts"] = {
		["metiers"] = {
			["Ðéjà Vu"] = "VXV-METIERS-1\\nC;Ðéjà Vu",
			["Ignoré"] = 3,
		},
		["autre"] = 1,
	},
}
`;

const read = (text: string) => readOutbox(readLuaData(new TextEncoder().encode(text)));

describe("outbox of the addon", () => {
  it("reads what the addon saved for the website", () => {
    expect(read(SAVED)).toEqual({
      kind: "read",
      outbox: {
        roster: { text: "VXV-ROSTER-1\nÐéjà;Vu;ROGUE", capturedAt: 1796904000 },
        raidLogs: ["VXV-LOG-1\nR;e1;1796904000;1796904120"],
        characters: [{ name: "Ðéjà Vu", race: "Scourge", sex: 3 }],
        changes: [
          {
            id: "Ðéjà Vu#1796904000#42",
            eventId: "e1",
            author: "Ðéjà Vu",
            at: 1796904000,
            kind: "reserves",
            itemIds: [20, 21],
          },
          { id: "Ðéjà Vu#1796904100#7", kind: "reserves", itemIds: [] },
        ],
        counters: [{ name: "Ðéjà Vu", type: "fishing", value: 412, at: 1796904200 }],
        texts: { metiers: { "Ðéjà Vu": "VXV-METIERS-1\nC;Ðéjà Vu" } },
      },
    });
  });

  it("leaves aside what it does not know, and tells a newer format or no data", () => {
    expect(read('VXV_SyncDB = { version = 1, raidLogs = { e1 = 3 }, characters = { X = "y" } }')).toEqual({
      kind: "read",
      outbox: { roster: undefined, raidLogs: [], characters: [], changes: [], counters: [], texts: {} },
    });
    expect(read("VXV_SyncDB = { version = 2 }")).toEqual({ kind: "newer" });
    expect(read("VXV_Other = 1")).toEqual({ kind: "none" });
  });

  it("merges the accounts: the latest roster, every record, character and change", () => {
    const merged = mergeOutboxes([
      {
        roster: { text: "old", capturedAt: 1 },
        raidLogs: ["log e1"],
        characters: [{ name: "A B", race: "Orc", sex: 2 }],
        changes: [{ id: "A B#1#1" }],
        counters: [{ name: "A B", type: "fishing", value: 12, at: 1 }],
        texts: { metiers: { "A B": "A" } },
      },
      {
        roster: { text: "new", capturedAt: 2 },
        raidLogs: ["log e1", "log e2"],
        characters: [],
        changes: [],
        counters: [{ name: "C D", type: "fishing", value: 3, at: 2 }],
        texts: { metiers: { "C D": "C" } },
      },
    ]);
    expect(merged).toEqual({
      roster: { text: "new", capturedAt: 2 },
      raidLogs: ["log e1", "log e2"],
      characters: [{ name: "A B", race: "Orc", sex: 2 }],
      changes: [{ id: "A B#1#1" }],
      counters: [
        { name: "A B", type: "fishing", value: 12, at: 1 },
        { name: "C D", type: "fishing", value: 3, at: 2 },
      ],
      texts: { metiers: { "A B": "A", "C D": "C" } },
    });
  });

  it("fingerprints a text, accents included, to send it once", () => {
    expect(textDigest("VXV-METIERS-1\nC;Ðéjà Vu")).toBe(textDigest("VXV-METIERS-1\nC;Ðéjà Vu"));
    expect(textDigest("VXV-METIERS-1\nC;Ðéjà Vu")).not.toBe(textDigest("VXV-METIERS-1\nC;Deja Vu"));
    expect(textDigest("")).toBe("811c9dc5");
  });
});
