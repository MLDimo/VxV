import { describe, expect, it } from "vitest";
import { startCore } from "../core.ts";
import { websiteText } from "../raid/fixtures.ts";
import { companionFiles } from "./fixtures.ts";

const BUNDLES = ["VXV_Raid", "VXV_Sync"];
const GUILD = `MockGuildMembers = {
  { name = "Ðéjà Vu", class = "ROGUE" },
  { name = "Thom Leboss", class = "PRIEST", online = false },
}`;
const EARLIER_RAID = `{ schemaVersion = 2, ui = {}, modules = { raid = { logs = { e0 = {
  eventId = "e0", title = "Onyxia", startsAt = 1796000000, startedAt = 1796000100, endedAt = 1796001000,
  kills = { { encounterId = 1084, boss = "Onyxia", at = 1796001000 } }, present = { ["Ðéjà Vu"] = true },
  deaths = {}, loots = {} } } } } }`;

/** VXV with the companion's inbox, logged in with the guild above. */
function startWithCompanion(savedVariables?: string) {
  const started = startCore({
    bundles: BUNDLES,
    beforeLogin: true,
    savedVariables,
    written: companionFiles({ raid: websiteText() }),
  });
  started.client(GUILD);
  started.client('Fire("PLAYER_LOGIN")');
  return started;
}

describe("what the companion takes to the website (VXV_SyncDB)", () => {
  it("keeps nothing without the companion", () => {
    const { client, errors } = startCore({ bundles: BUNDLES });
    client(`${GUILD} Fire("GUILD_ROSTER_UPDATE")`);
    expect(client("return VXV_SyncDB")).toEqual({
      version: 1,
      raidLogs: {},
      characters: {},
      changes: {},
      counters: {},
    });
    expect(errors()).toEqual([]);
  });

  it("keeps the player's character and the guild's roster", () => {
    const { client, errors } = startWithCompanion();
    expect(client("return VXV_SyncDB.characters")).toEqual({ "Ðéjà Vu": { race: "Scourge", sex: 3 } });
    expect(client("return VXV_SyncDB.roster")).toEqual({
      text: "VXV-ROSTER-1\nÐéjà;Vu;ROGUE\nThom;Leboss;PRIEST",
      capturedAt: 1796904000,
    });
    expect(errors()).toEqual([]);
  });

  it("reads the roster again at its updates, once a minute at most", () => {
    const { client } = startWithCompanion();
    client('table.insert(MockGuildMembers, { name = "Ciel Gris", class = "WARRIOR" }) Fire("GUILD_ROSTER_UPDATE")');
    expect(client("return VXV_SyncDB.roster.text")).not.toContain("Ciel");
    client('AdvanceTime(60) Fire("GUILD_ROSTER_UPDATE")');
    expect(client("return VXV_SyncDB.roster")).toEqual({
      text: "VXV-ROSTER-1\nÐéjà;Vu;ROGUE\nThom;Leboss;PRIEST\nCiel;Gris;WARRIOR",
      capturedAt: 1796904060,
    });
  });

  it("hands each raid's log over as the website imports it, from the first kill", () => {
    // Alone, out of any group: nobody is counted present.
    const { client } = startWithCompanion();
    client('Fire("ENCOUNTER_START", 1084, "Onyxia", 9, 40)');
    expect(client("return VXV_SyncDB.raidLogs.e1")).toBeUndefined();
    client('AdvanceTime(120) Fire("ENCOUNTER_END", 1084, "Onyxia", 9, 40, 1)');
    expect(String(client("return VXV_SyncDB.raidLogs.e1")).split("\n")).toEqual([
      "VXV-LOG-2",
      "R;e1;1796904000;1796904120",
      "K;1084;1796904120",
    ]);
  });

  it("hands over the logs of earlier raids at the next launch", () => {
    const { client } = startWithCompanion(EARLIER_RAID);
    expect(String(client("return VXV_SyncDB.raidLogs.e0")).split("\n")).toEqual([
      "VXV-LOG-2",
      "R;e0;1796000100;1796001000",
      "K;1084;1796001000",
      "P;Ðéjà Vu",
    ]);
  });
});
