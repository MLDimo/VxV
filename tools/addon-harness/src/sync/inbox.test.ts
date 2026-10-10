import { describe, expect, it } from "vitest";
import { startCore } from "../core.ts";
import { startGuild } from "../guild.ts";
import { ONYXIA_NIGHT, startRaid, websiteText } from "../raid/fixtures.ts";
import { companionFiles } from "./fixtures.ts";

const BUNDLES = ["Raid", "Sync"];
const EVENT = `
  local _, ns = ...
  local event = ns.RaidData.Current()
  local _, sender = ns.RaidData.Text()
  return event and { title = event.title, exportedAt = event.exportedAt, sender = sender or "compagnon" }
`;

/** Carries messages and moves the clocks until the send queues are empty. */
function settle(guild: ReturnType<typeof startGuild>): void {
  for (let second = 0; second < 90; second += 1) {
    guild.deliver();
    guild.advanceTime(1);
  }
}

describe("the companion's data in game (Sync)", () => {
  it("changes nothing without the companion", () => {
    const { bundles, errors, client } = startCore({ bundles: BUNDLES });
    expect(bundles.Raid?.run(EVENT)).toBeUndefined();
    expect(client("return #Printed")).toBe(0);
    expect(errors()).toEqual([]);
  });

  it("shows a member the next event brought by their companion", () => {
    const { raid, errors } = startRaid({ written: companionFiles({ raid: websiteText() }) });
    expect(raid.run(EVENT)).toEqual({ title: "Onyxia", exportedAt: 1796931900, sender: "compagnon" });
    expect(raid.run("local _, ns = ... return ns.RaidView.Header(ns.RaidData.Current(), nil, time()).subtitle")).toBe(
      "10/12 20:00 · 2 SR par joueur · données du compagnon, du 10/12 19:45",
    );
    expect(errors()).toEqual([]);
  });

  it("loads the raid the player's own companion brought, without any error nor a word in the chat", () => {
    const { raid, client, errors } = startRaid({
      playerName: "Thom Leboss",
      written: companionFiles({ raid: websiteText() }),
    });
    expect(raid.run(EVENT)).toEqual({ title: "Onyxia", exportedAt: 1796931900, sender: "compagnon" });
    expect(client("return Printed")).toEqual({});
    expect(errors()).toEqual([]);
  });

  it("lets an officer's companion feed the members connected without one", () => {
    const guild = startGuild(["Thom Leboss", "Ciel Gris"], { bundles: BUNDLES });
    settle(guild);
    guild.join("Ðéjà Vu", { written: companionFiles({ raid: websiteText() }) });
    settle(guild);
    for (const name of ["Thom Leboss", "Ciel Gris"]) {
      expect(guild.player(name).bundles.Raid?.run(EVENT)).toEqual({
        title: "Onyxia",
        exportedAt: 1796931900,
        sender: "Ðéjà Vu",
      });
    }
    for (const player of guild.players) {
      expect(player.errors()).toEqual([]);
    }
  });

  it("keeps newer data received from an officer at an earlier session", () => {
    const newer = websiteText({ ...ONYXIA_NIGHT, exportedAt: new Date("2026-12-10T19:50:00Z") });
    const { raid } = startRaid({
      savedVariables: `{ schemaVersion = 2, ui = {}, modules = { raid = { text = ${JSON.stringify(newer)}, sender = "Ðéjà Vu" } } }`,
      written: companionFiles({ raid: websiteText() }),
    });
    expect(raid.run(EVENT)).toEqual({ title: "Onyxia", exportedAt: 1796932200, sender: "Ðéjà Vu" });
  });

  it("asks to update the addon, under the Taverne, when the companion writes a newer format", () => {
    const { raid, client } = startRaid({ written: companionFiles({ version: 2, raid: websiteText() }) });
    expect(raid.run(EVENT)).toBeUndefined();
    expect(client("return Printed")).toEqual({});
    expect(
      client(`SlashCmdList.VXV("")
        return FindWidget(VXV_Window, function(w) return tostring(w.text):find("Connectés avec VXV", 1, true) end).text`),
    ).toContain("mise à jour disponible");
  });
});
