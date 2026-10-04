import { describe, expect, it } from "vitest";
import { FOREVER_EVENTS } from "../forever.ts";
import { killAndOpen, link, LINKS, OFFICER, PANEL_ROWS, raidWithData, settle } from "./raidGroup.ts";

const { tete: TETE, sac: SAC, ecaille: ECAILLE, cape: CAPE } = LINKS;

describe("loot of the boss", () => {
  it("shows the whole raid what the boss dropped, with the soft reserves set on each item", () => {
    const guild = raidWithData([OFFICER, "Thom Leboss", "Aube Claire"], ["Ciel Gris"]);
    killAndOpen(guild, [TETE, SAC, ECAILLE, CAPE]);
    const thom = guild.player("Thom Leboss");
    expect(thom.client("return VXV_LootPanel:IsShown()")).toBe(true);
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
    const guild = raidWithData([OFFICER, "Thom Leboss", "Aube Claire"], ["Ciel Gris"]);
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
    const guild = raidWithData([OFFICER, "Thom Leboss", "Aube Claire"], ["Ciel Gris"]);
    guild
      .player("Aube Claire")
      .client(
        `VXV.Broadcast("loot.drop", { encounterId = 1, boss = "Faux", items = { { slot = 1, itemId = 20, link = ${TETE} } } }, "RAID")`,
      );
    settle(guild);
    expect(guild.player("Thom Leboss").client("return VXV_LootPanel")).toBeUndefined();
  });

  it("shows the last loot again with /vxv butin", () => {
    const guild = raidWithData([OFFICER, "Thom Leboss", "Aube Claire"], ["Ciel Gris"]);
    const thom = guild.player("Thom Leboss");
    thom.client('SlashCmdList.VXV("butin")');
    expect(thom.client(PANEL_ROWS)).toEqual([
      "Aucun butin de boss pour l'instant : il s'affiche quand le maître du butin ouvre le corps.",
    ]);
  });
});
