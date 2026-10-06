import { describe, expect, it } from "vitest";
import { startCore } from "../core.ts";
import { startGuild } from "../guild.ts";
import { ONYXIA_NIGHT, startRaid, websiteText } from "../raid/fixtures.ts";
import { companionFiles } from "./fixtures.ts";

const BUNDLES = ["VXV_Raid", "VXV_Sync"];
const PREFIX = "|cff14b8a6VXV|r ";
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

describe("the companion's data in game (VXV_Sync)", () => {
  it("changes nothing without the companion", () => {
    const { bundles, errors, client } = startCore({ bundles: BUNDLES });
    expect(bundles.VXV_Raid?.run(EVENT)).toBeUndefined();
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

  it("tells the player, without any error, the raid their own companion brought", () => {
    const { client, errors } = startRaid({
      playerName: "Thom Leboss",
      written: companionFiles({ raid: websiteText() }),
    });
    expect(client("return Printed")).toContain(
      `${PREFIX}Raid chargé par ton compagnon VXV : Onyxia, le 10/12 20:00. Tape /vxv pour voir les inscrits et les SR.`,
    );
    expect(errors()).toEqual([]);
  });

  it("lets an officer's companion feed the members connected without one", () => {
    const guild = startGuild(["Thom Leboss", "Ciel Gris"], { bundles: BUNDLES });
    settle(guild);
    guild.join("Ðéjà Vu", { written: companionFiles({ raid: websiteText() }) });
    settle(guild);
    for (const name of ["Thom Leboss", "Ciel Gris"]) {
      expect(guild.player(name).bundles.VXV_Raid?.run(EVENT)).toEqual({
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

  it("asks to update the addon when the companion writes a newer format", () => {
    const { raid, client } = startRaid({ written: companionFiles({ version: 2, raid: websiteText() }) });
    expect(raid.run(EVENT)).toBeUndefined();
    expect(client("return Printed")).toEqual([
      `${PREFIX}Ton compagnon VXV est plus récent que l'addon : mets l'addon à jour pour profiter de ses données.`,
    ]);
  });

  it("reminds an officer with the companion to type /reload when their data are stale", () => {
    const stale = websiteText({ ...ONYXIA_NIGHT, exportedAt: new Date("2026-12-10T11:00:00Z") });
    const guild = startGuild(["Ðéjà Vu"], { bundles: BUNDLES, written: companionFiles({ raid: stale }) });
    guild.advanceTime(7 * 3600 + 35 * 60);
    expect(guild.player("Ðéjà Vu").client("return Printed")).toContain(
      `${PREFIX}SR verrouillées depuis le 10/12 19:30, mais tes données sont du 10/12 11:00 : tape /reload pour ` +
        "charger celles du compagnon et envoyer les SR définitives à la guilde.",
    );
  });
});
