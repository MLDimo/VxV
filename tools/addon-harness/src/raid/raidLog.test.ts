import { describe, expect, it } from "vitest";
import { startRaid, websiteText } from "./fixtures.ts";
import { killAndOpen, link, LINKS, OFFICER, raidWithData, settle, type Guild } from "./raidGroup.ts";

const LOG = `
  local _, ns = ...
  local log = ns.RaidLog.Current()
  if log == nil then return nil end
  local kills = {}
  for _, kill in ipairs(log.kills) do kills[#kills + 1] = kill.encounterId .. " " .. kill.boss end
  local loots = {}
  for _, loot in ipairs(log.loots) do loots[#loots + 1] = loot.itemId .. " " .. loot.winner .. " " .. loot.method end
  local present = {}
  for name in pairs(log.present) do present[#present + 1] = name end
  table.sort(present)
  return { kills = kills, loots = loots, present = present, deaths = log.deaths }
`;
const OPEN_LOOT_TAB = `
  SlashCmdList.VXV("")
  FindWidget(VXV_Window, function(widget) return widget.text == "Butin" end):Run("OnClick")
`;
const TAB_ROWS = `
  local texts = {}
  FindWidget(VXV_Window, function(widget)
      if widget.label ~= nil and widget.shown then texts[#texts + 1] = widget.label.text end
  end)
  return texts
`;

/** A raid on Onyxia: Thom Leboss dies once during the encounter; then the officer gives the Tête d'Onyxia to
 * Thom Leboss from the panel (his single soft reserve) and the cape to Aube Claire from the game's menu. */
function playOnyxia(): Guild {
  const guild = raidWithData([OFFICER, "Thom Leboss", "Aube Claire"], ["Ciel Gris"]);
  for (const player of guild.players) {
    player.client('Fire("ENCOUNTER_START", 1084, "Onyxia", 9, 40) Dead["Thom Leboss"] = true');
  }
  settle(guild, 3);
  for (const player of guild.players) {
    player.client('Dead["Thom Leboss"] = false');
  }
  settle(guild, 3);
  killAndOpen(guild, [LINKS.tete, LINKS.cape]);
  const officer = guild.player(OFFICER);
  officer.client(`FindWidget(VXV_LootPanel, function(widget)
      return widget.row and widget.row.start and widget.row.start.itemId == 20
  end):Run("OnMouseUp")`);
  settle(guild, 1);
  officer.client(
    `FindWidget(VXV_LootPanel, function(widget) return widget.text == "Donner à Thom Leboss" end):Run("OnClick")`,
  );
  officer.client("GiveMasterLoot(2, 3)");
  settle(guild);
  return guild;
}

describe("record of the raid", () => {
  it("records the bosses, the players present, the deaths and each item given, on every member's addon", () => {
    const guild = playOnyxia();
    const expected = {
      kills: ["1084 Onyxia"],
      loots: ["20 Thom Leboss soft_reserve_plus", "99 Aube Claire loot_council"],
      present: ["Aube Claire", "Thom Leboss", OFFICER],
      deaths: { "Thom Leboss": 1 },
    };
    for (const name of [OFFICER, "Thom Leboss", "Aube Claire"]) {
      expect(guild.player(name).bundles.VXV_Raid?.run(LOG)).toEqual(expected);
    }
    for (const player of guild.players) {
      expect(player.errors()).toEqual([]);
    }
  });

  it("shows the raid in the Butin tab, and lets an officer export it for the website", () => {
    const guild = playOnyxia();
    const officer = guild.player(OFFICER);
    officer.client(OPEN_LOOT_TAB);
    const rows = officer.client(TAB_ROWS) as unknown as string[];
    expect(rows.slice(0, 2)).toEqual([
      "Onyxia · 10/12 20:00",
      expect.stringMatching(/^Boss tués : Onyxia \(\d\d:\d\d\)$/),
    ]);
    expect(rows.slice(2)).toEqual([
      "Objets donnés (2)",
      `${link(20, "Tête d'Onyxia")} → Thom Leboss (SR+)`,
      `${link(99, "Cape inconnue")} → Aube Claire (loot council)`,
      "Morts : Thom Leboss ×1",
    ]);

    officer.client(
      'FindWidget(VXV_Window, function(widget) return widget.text == "Exporter pour le site" end):Run("OnClick")',
    );
    const exported = (officer.client("return VXV_TextWindow.editBox:GetText()") as string).split("\n");
    expect(exported).toEqual([
      "VXV-LOG-1",
      expect.stringMatching(/^R;e1;\d+;\d+$/),
      expect.stringMatching(/^K;1084;\d+$/),
      "P;Aube Claire",
      "P;Thom Leboss",
      `P;${OFFICER}`,
      expect.stringMatching(/^L;1084;20;Thom Leboss;soft_reserve_plus;\d+$/),
      expect.stringMatching(/^L;1084;99;Aube Claire;loot_council;\d+$/),
      "D;Thom Leboss;1",
    ]);
    expect(officer.client("return Printed")).toContain(
      "|cff14b8a6VXV|r Journal du raid prêt : Ctrl+C, puis colle-le sur la page de l'événement du site (officiers).",
    );

    const thom = guild.player("Thom Leboss");
    thom.client(OPEN_LOOT_TAB);
    expect(
      thom.client(
        'return FindWidget(VXV_Window, function(widget) return widget.text == "Exporter pour le site" end).shown',
      ),
    ).toBe(false);
  });

  it("ignores a give that does not come from the master looter", () => {
    const guild = raidWithData([OFFICER, "Thom Leboss", "Aube Claire"]);
    killAndOpen(guild, [LINKS.tete]);
    guild.player("Aube Claire").client(`VXV.Broadcast("loot.recorded", { eventId = "e1", loot = { encounterId = 1084,
        boss = "Onyxia", itemId = 20, link = ${LINKS.tete}, winner = "Aube Claire", method = "free_roll", at = 1 } },
        "RAID")`);
    settle(guild);
    expect(guild.player("Thom Leboss").bundles.VXV_Raid?.run(LOG)).toMatchObject({ loots: {} });
  });

  it("lists the previous raids after /reload, and keeps the 20 latest", () => {
    const logs = Array.from(
      { length: 21 },
      (_, index) =>
        `["old${String(index)}"] = { eventId = "old${String(index)}", title = "Raid ${String(index)}", startsAt = ${String(
          1790000000 + index * 86400,
        )}, kills = {}, present = {}, deaths = {}, loots = {} }`,
    );
    const { raid, client, errors } = startRaid({
      savedVariables: `{ schemaVersion = 2, modules = { raid = { text = ${JSON.stringify(websiteText())}, logs = { ${logs.join(", ")} } } } }`,
    });
    raid.run("local _, ns = ... ns.RaidLog.Current()");
    expect(raid.run("local _, ns = ... return #ns.RaidLog.All()")).toBe(20);
    client(OPEN_LOOT_TAB);
    const rows = client(TAB_ROWS) as unknown as string[];
    expect(rows).toContain("Raids précédents");
    expect(rows).toContain("Raid 20 · 11/10 14:13 : 0 boss, 0 objets");
    expect(rows).not.toContainEqual(expect.stringContaining("Raid 0 ·"));
    expect(errors()).toEqual([]);
  });

  it("records nothing without the event's data", () => {
    const { raid, client, errors } = startRaid();
    client('Fire("ENCOUNTER_START", 1084, "Onyxia", 9, 40) Fire("ENCOUNTER_END", 1084, "Onyxia", 9, 40, 1)');
    expect(raid.run(LOG)).toBeUndefined();
    expect(errors()).toEqual([]);
  });
});
