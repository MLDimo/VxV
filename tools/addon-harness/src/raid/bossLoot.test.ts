import { describe, expect, it } from "vitest";
import { FOREVER_EVENTS } from "../forever.ts";
import { startGuild } from "../guild.ts";
import { importText, websiteText } from "./fixtures.ts";

const RAID = { bundles: ["VXV_Raid"] };
const OFFICER = "Ðéjà Vu";
const TETE = 'ItemLink(20, "Tête d\'Onyxia")';
const SAC = 'ItemLink(21, "Sac en peau")';
const ECAILLE = 'ItemLink(30, "Écaille d\'Onyxia")';
const CAPE = 'ItemLink(99, "Cape inconnue")';
const PANEL_ROWS = `
  local texts = {}
  FindWidget(VXV_LootPanel, function(widget)
      if widget.label ~= nil and widget.shown then texts[#texts + 1] = widget.label.text end
  end)
  return texts
`;

type Guild = ReturnType<typeof startGuild>;

function settle(guild: Guild): void {
  for (let second = 0; second < 30; second += 1) {
    guild.deliver();
    guild.advanceTime(1);
  }
}

/** The officer (master looter), Thom Leboss and Aube Claire in a raid; Ciel Gris, who reserved, is not there. */
function raidWithData(): Guild {
  const names = [OFFICER, "Thom Leboss", "Aube Claire", "Ciel Gris"];
  const guild = startGuild(names, RAID);
  settle(guild);
  importText(guild.player(OFFICER).client, websiteText());
  settle(guild);
  const inRaid = names.slice(0, 3);
  for (const name of inRaid) {
    const others = inRaid.filter((other) => other !== name).map((other) => JSON.stringify(other));
    guild.player(name).client(`Group.members = { ${others.join(", ")} } Group.raid = true MasterLooter = "${OFFICER}"`);
  }
  return guild;
}

function killAndOpen(guild: Guild, links: string[]): void {
  for (const player of guild.players) {
    player.client('Fire("ENCOUNTER_END", 1084, "Onyxia", 9, 40, 1)');
  }
  guild.player(OFFICER).client(`CorpseLinks = { ${links.join(", ")} } Fire("LOOT_OPENED")`);
  settle(guild);
}

describe("loot of the boss", () => {
  it("shows the whole raid what the boss dropped, with the soft reserves set on each item", () => {
    const guild = raidWithData();
    killAndOpen(guild, [TETE, SAC, ECAILLE, CAPE]);
    const thom = guild.player("Thom Leboss");
    expect(thom.client("return VXV_LootPanel:IsShown()")).toBe(true);
    const link = (id: number, name: string) => `|cffa335ee|Hitem:${String(id)}::::::::60:::::|h[${name}]|h|r`;
    expect(thom.client(PANEL_ROWS)).toEqual([
      "Butin de Onyxia",
      `${link(20, "Tête d'Onyxia")} : SR de |cffffffffThom Leboss|r +20, |cff808080Ciel Gris (absent)|r`,
      `${link(21, "Sac en peau")} : SR de |cfffff468Ðéjà Vu|r +10`,
      `${link(30, "Écaille d'Onyxia")} : exclu des SR (loot council)`,
      `${link(99, "Cape inconnue")} : aucune SR, roll libre`,
    ]);
    expect(guild.player("Ciel Gris").client("return VXV_LootPanel")).toBeUndefined();

    thom.client(
      'FindWidget(VXV_LootPanel, function(widget) return widget.row and widget.row.link and widget.shown end):Run("OnEnter")',
    );
    expect(thom.client("return GameTooltip.link")).toBe(link(20, "Tête d'Onyxia"));
    for (const player of guild.players) {
      expect(player.errors()).toEqual([]);
      expect(player.registeredEvents().filter((event) => !FOREVER_EVENTS.has(event))).toEqual([]);
    }
  });

  it("reads only the first corpse after a kill, and nothing before any kill", () => {
    const guild = raidWithData();
    const officer = guild.player(OFFICER);
    officer.client(`CorpseLinks = { ${CAPE} } Fire("LOOT_OPENED")`);
    settle(guild);
    expect(guild.player("Thom Leboss").client("return VXV_LootPanel")).toBeUndefined();

    killAndOpen(guild, [TETE]);
    officer.client(`CorpseLinks = { ${CAPE} } Fire("LOOT_OPENED")`);
    settle(guild);
    expect(guild.player("Thom Leboss").client(PANEL_ROWS)).toHaveLength(2);
  });

  it("takes the loot from the master looter only", () => {
    const guild = raidWithData();
    guild
      .player("Aube Claire")
      .client(
        `VXV.Broadcast("loot.drop", { encounterId = 1, boss = "Faux", items = { { slot = 1, itemId = 20, link = ${TETE} } } }, "RAID")`,
      );
    settle(guild);
    expect(guild.player("Thom Leboss").client("return VXV_LootPanel")).toBeUndefined();
  });

  it("shows the last loot again with /vxv butin", () => {
    const guild = raidWithData();
    const thom = guild.player("Thom Leboss");
    thom.client('SlashCmdList.VXV("butin")');
    expect(thom.client(PANEL_ROWS)).toEqual([
      "Aucun butin de boss pour l'instant : il s'affiche quand le maître du butin ouvre le corps.",
    ]);
  });
});
