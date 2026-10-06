import { parseRaidLog } from "@vxv/server/domain/raidLog";
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
/** Lua: the game's meter and the resurrections in the current event's log. */
const TITLES_LOG = `
  local _, ns = ...
  local log = ns.RaidLog.Current()
  return { meter = log.meter, raised = log.raised }
`;
/** Lua: a boss killed, whose session of the game's meter holds these amounts by meter type (0 damage, 2 healing). */
const KILL_WITH_METER = (sessionId: number, damage: string, healing: string) => `
  MeterSessions[${String(sessionId)}] = { [0] = { ${damage} }, [2] = { ${healing} } }
  InCombat = true
  Fire("ENCOUNTER_START", 1084, "Onyxia", 9, 40)
  Fire("ENCOUNTER_END", 1084, "Onyxia", 9, 40, 1)
`;
const OPEN_TAB = (name: string) => `
  SlashCmdList.VXV("")
  FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "${name}" end):Run("OnClick")
`;
/** Lua: the accounts book of the Journal, its cover (filled with leather) and its pages (filled with parchment);
 * fills(token, under) finds the textures filled with a token's color under a frame. */
const BOOK = `
  local function fills(token, under)
    local r, g, b = VXV.Theme.Color(token)
    local found = {}
    local function walk(frame)
      for _, child in ipairs(frame.children or {}) do
        local color = child.kind == "Texture" and child.color
        if color and math.abs(color[1] - r) < 0.001 and math.abs(color[2] - g) < 0.001
          and math.abs(color[3] - b) < 0.001 then
          found[#found + 1] = child
        end
        walk(child)
      end
    end
    walk(under)
    return found
  end
  local cover = fills("leather", VXV_Window)[1].parent
  local pages = {}
  for _, fill in ipairs(fills("parchment", cover)) do pages[#pages + 1] = fill.parent end
`;
const EXPORT = 'FindButton(VXV_Window, "Exporter le journal du raid")';
const TAB_ROWS = `
  local texts = {}
  FindWidget(VXV_Window, function(widget)
      if widget.row ~= nil and widget.shown then texts[#texts + 1] = widget.label.text end
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
  officer.client(`FindButton(VXV_LootPanel, "Donner à Thom Leboss"):Run("OnClick")`);
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

  it("shows the raid in the Journal, and lets an officer export it for the website from the Raid screen", () => {
    const guild = playOnyxia();
    const officer = guild.player(OFFICER);
    officer.client(OPEN_TAB("Journal"));
    const rows = officer.client(TAB_ROWS) as unknown as string[];
    expect(rows.slice(0, 2)).toEqual([
      "Onyxia · 10/12 20:00",
      expect.stringMatching(/^Boss tués : Onyxia \(\d\d:\d\d\)$/),
    ]);
    expect(rows.slice(2, 6)).toEqual([
      "Objets donnés (2)",
      `${link(20, "Tête d'Onyxia")} → Thom Leboss (SR+)`,
      `${link(99, "Cape inconnue")} → Aube Claire (loot council)`,
      "Morts : Thom Leboss ×1",
    ]);

    officer.client(OPEN_TAB("Raid"));
    officer.client(`${EXPORT}:Run("OnClick")`);
    const exported = (officer.client("return VXV_TextWindow.editBox:GetText()") as string).split("\n");
    expect(exported).toEqual([
      "VXV-LOG-2",
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
    thom.client(OPEN_TAB("Raid"));
    expect(thom.client(`return IsVisible(${EXPORT})`)).toBe(false);
  });

  it("exports a log the website reads (contract VXV-LOG-2)", () => {
    const officer = playOnyxia().player(OFFICER);
    officer.client(`SlashCmdList.VXV("journal")`);
    const log = parseRaidLog(officer.client("return VXV_TextWindow.editBox:GetText()") as string);
    expect(log).toMatchObject({
      eventId: "e1",
      kills: [{ encounterId: 1084 }],
      present: ["Aube Claire", "Thom Leboss", OFFICER],
      loots: [
        { encounterId: 1084, itemId: 20, winner: "Thom Leboss", method: "soft_reserve_plus" },
        { encounterId: 1084, itemId: 99, winner: "Aube Claire", method: "loot_council" },
      ],
      deaths: [{ name: "Thom Leboss", count: 1 }],
    });
    expect(log.startedAt?.getTime()).toBeLessThanOrEqual(log.endedAt?.getTime() ?? 0);
  });

  it("adds up the game's meter of each boss killed, read once out of combat, for the group's members", () => {
    const guild = raidWithData([OFFICER, "Thom Leboss", "Aube Claire"]);
    for (const player of guild.players) {
      player.client(
        KILL_WITH_METER(
          7,
          `["${OFFICER}"] = 1000.6, ["Thom Leboss"] = 500, ["Passant Inconnu"] = 900`,
          `["Aube Claire"] = 800`,
        ),
      );
    }
    settle(guild, 3);
    const officer = guild.player(OFFICER);
    // Secret during the combat: nothing read yet.
    expect(officer.bundles.VXV_Raid?.run(TITLES_LOG)).toEqual({ meter: {}, raised: {} });
    for (const player of guild.players) {
      player.client("InCombat = false");
    }
    settle(guild, 3);
    for (const player of guild.players) {
      player.client(KILL_WITH_METER(8, `["Thom Leboss"] = 250`, `["Aube Claire"] = 100`) + " InCombat = false");
    }
    settle(guild, 3);
    expect(officer.bundles.VXV_Raid?.run(TITLES_LOG)).toEqual({
      meter: {
        [OFFICER]: { damage: 1000, healing: 0 },
        "Thom Leboss": { damage: 750, healing: 0 },
        "Aube Claire": { damage: 0, healing: 900 },
      },
      raised: {},
    });
    officer.client(`SlashCmdList.VXV("journal")`);
    const log = parseRaidLog(officer.client("return VXV_TextWindow.editBox:GetText()") as string);
    expect(log.meter).toEqual([
      { name: "Aube Claire", damage: 0, healing: 900 },
      { name: "Thom Leboss", damage: 750, healing: 0 },
      { name: OFFICER, damage: 1000, healing: 0 },
    ]);
    for (const player of guild.players) {
      expect(player.errors()).toEqual([]);
    }
  });

  it("counts a resurrection the player accepted, on every member's log, but not a run back to the corpse", () => {
    const guild = raidWithData([OFFICER, "Thom Leboss", "Aube Claire"]);
    const thom = guild.player("Thom Leboss");
    // Raised from the corpse: accepted.
    thom.client('Dead["Thom Leboss"] = true Fire("RESURRECT_REQUEST", "Aube Claire")');
    thom.client('Dead["Thom Leboss"] = false Fire("PLAYER_ALIVE")');
    settle(guild, 3);
    // Released while offered, then back from the corpse: not a resurrection.
    thom.client('Dead["Thom Leboss"] = true Fire("RESURRECT_REQUEST", "Aube Claire") Fire("PLAYER_ALIVE")');
    thom.client('Dead["Thom Leboss"] = false Fire("PLAYER_UNGHOST")');
    // An offer left to expire, then back from the corpse: not one either.
    thom.client('Dead["Thom Leboss"] = true Fire("RESURRECT_REQUEST", "Aube Claire")');
    settle(guild, 61);
    thom.client('Dead["Thom Leboss"] = false Fire("PLAYER_UNGHOST")');
    // Raised as a ghost: accepted.
    thom.client('Dead["Thom Leboss"] = true Fire("RESURRECT_REQUEST", "Aube Claire")');
    thom.client('Dead["Thom Leboss"] = false Fire("PLAYER_UNGHOST")');
    settle(guild, 3);
    for (const name of [OFFICER, "Thom Leboss", "Aube Claire"]) {
      expect(guild.player(name).bundles.VXV_Raid?.run(TITLES_LOG)).toEqual({ meter: {}, raised: { "Thom Leboss": 2 } });
    }
    const exported = guild
      .player(OFFICER)
      .bundles.VXV_Raid?.run("local _, ns = ... return ns.RaidLog.Export(ns.RaidLog.Current())");
    expect(parseRaidLog(exported as string).raised).toEqual([{ name: "Thom Leboss", count: 2 }]);
    expect(thom.errors()).toEqual([]);
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
    client(OPEN_TAB("Journal"));
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

  it("draws the Journal's parchment pages above the book's leather cover", () => {
    const { client } = startRaid();
    client(OPEN_TAB("Journal"));
    const levels = client(`
      ${BOOK}
      local levels = {}
      for _, page in ipairs(pages) do levels[#levels + 1] = page.frameLevel end
      return { cover = cover.frameLevel, pages = levels }
    `) as unknown as { cover: number; pages: number[] };
    expect(levels.pages).toHaveLength(2);
    expect(Math.min(...levels.pages)).toBeGreaterThan(levels.cover);
  });

  it("writes every line of the Journal's pages on a rule, within the page", () => {
    const officer = playOnyxia().player(OFFICER);
    officer.client(OPEN_TAB("Journal"));
    // From the middle of each text (titles, page texts, the list's rows) down to the first rule under it.
    const pages = officer.client(`
      ${BOOK}
      local result = {}
      for _, page in ipairs(pages) do
        local rules, middles, bounded = {}, {}, true
        for _, rule in ipairs(fills("ruling", page)) do rules[#rules + 1] = -rule.points[1][3] end
        table.sort(rules)
        for _, child in ipairs(page.children) do
          if child.kind == "FontString" then
            middles[#middles + 1] = -child.points[1][5]
            bounded = bounded and #child.points == 2 and child.wordWrap == false
          elseif child.kind == "Frame" then
            local top = -child.points[1][3]
            for _, row in ipairs(child.children[1].scrollChild.children) do
              if row.shown then middles[#middles + 1] = top - row.points[1][3] + row.height / 2 end
            end
          end
        end
        local gaps = {}
        for _, middle in ipairs(middles) do
          local gap = math.huge
          for _, y in ipairs(rules) do
            if y > middle then gap = math.min(gap, y - middle) end
          end
          gaps[#gaps + 1] = gap
        end
        result[#result + 1] = { gaps = gaps, line = rules[2] - rules[1], bounded = bounded }
      end
      return result
    `) as unknown as { gaps: number[]; line: number; bounded: boolean }[];
    const gaps = pages.flatMap((page) => page.gaps);
    expect(gaps.length).toBeGreaterThan(10);
    expect(new Set(gaps).size).toBe(1);
    expect(gaps[0]).toBeGreaterThan(0);
    expect(gaps[0]).toBeLessThan((pages[0]?.line ?? 0) / 2);
    expect(pages.map((page) => page.bounded)).toEqual([true, true]);
  });
});
