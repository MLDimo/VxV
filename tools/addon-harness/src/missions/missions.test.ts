import { describe, expect, it } from "vitest";
import { startGuild } from "../guild.ts";
import { companionFiles } from "../sync/fixtures.ts";
import { GUILD_QUESTS, mission, questsText, startQuests } from "./fixtures.ts";

const OPEN_TAB = (name: string) => `
  SlashCmdList.VXV("")
  FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "${name}" end):Run("OnClick")
`;
const ROWS = (frame = "VXV_Window") => `
  local texts = {}
  FindWidget(${frame}, function(widget)
      if widget.row ~= nil and widget.shown then texts[#texts + 1] = widget.label.text end
  end)
  return texts
`;
const OUTBOX = `
  local list = {}
  for key, reading in pairs(VXV_SyncDB.counters) do list[#list + 1] = reading end
  return list
`;
/** French typography keeps numbers and units together: plain spaces here; class colors left out. */
const plain = (texts: unknown) =>
  (texts as string[]).map((text) => text.replace(/[\u00a0\u202f]/gu, " ").replace(/\|c\w{8}(.*?)\|r/gu, "$1"));
const outbox = (client: (code: string) => unknown, type?: string): unknown[] => {
  const list = client(OUTBOX);
  return (Array.isArray(list) ? list : []).filter(
    (reading) => type === undefined || (reading as { type: string }).type === type,
  );
};

describe("Les Quêtes in game (P12.3, P12.5, P12.8)", () => {
  it("shows the running quest the companion brought: what counts, its reward, its ranking and the hall of fame", () => {
    const { client, errors } = startQuests();
    client(OPEN_TAB("Quêtes"));
    const rows = plain(client(ROWS()));
    expect(rows.slice(0, 7)).toEqual([
      "Le Chasseur de têtes",
      "Victoires honorables · le plus de victoires honorables",
      expect.stringMatching(/^Se termine le \d\d\/12 \d\d:\d\d$/u),
      "Récompense 2 000 po : 1er 1 400 po · 2e 400 po · 3e 200 po",
      "Classement",
      "1. Thom Leboss · 12",
      "Ma progression",
    ]);
    expect(rows).toContain("1. Thom Leboss · 2 gagnées · 1 800 po · pos. 1,5");
    expect(errors()).toEqual([]);
  });

  it("reads the honorable kills, keeps each change for the companion and climbs the live ranking", () => {
    const { client, errors } = startQuests();
    client("Counters.honorableKills = 100 AdvanceTime(5)");
    expect(outbox(client, "honorableKills")).toEqual([
      { name: "Ðéjà Vu", type: "honorableKills", value: 100, at: 1796904005 },
    ]);
    client("Counters.honorableKills = 120 AdvanceTime(60)");
    expect(outbox(client, "honorableKills")).toEqual([
      { name: "Ðéjà Vu", type: "honorableKills", value: 120, at: 1796904065 },
    ]);
    client(OPEN_TAB("Quêtes"));
    const rows = plain(client(ROWS()));
    expect(rows).toContain("1. Ðéjà Vu · 20");
    expect(rows).toContain("2. Thom Leboss · 12");
    expect(rows).toContain("20 victoires honorables · 1er");
    // In combat, the counters are not read.
    client("InCombat = true Counters.honorableKills = 130 AdvanceTime(60)");
    expect(outbox(client, "honorableKills")).toEqual([expect.objectContaining({ value: 120 })]);
    expect(errors()).toEqual([]);
  });

  it("reads the fishing from the game's statistics", () => {
    const { client } = startQuests();
    client('Counters.statistics[1456] = "12" AdvanceTime(5)');
    expect(outbox(client)).toEqual(expect.arrayContaining([expect.objectContaining({ type: "fishing", value: 12 })]));
  });

  it("counts one gathering per loot window holding a herb, an ore or a leather, as the game does not", () => {
    const { client } = startQuests();
    client(`
      ItemInfo[2447] = { name = "Pacifique", classID = 7, subclassID = 9 }
      ItemInfo[2770] = { name = "Minerai de cuivre", classID = 7, subclassID = 7 }
      ItemInfo[2835] = { name = "Pierre brute", classID = 7, subclassID = 7 }
      ItemInfo[2318] = { name = "Cuir léger", classID = 7, subclassID = 6 }
      ItemInfo[4865] = { name = "Griffe ébréchée", classID = 15, subclassID = 0 }
      local function loot(...) CorpseLinks = { ... } Fire("LOOT_OPENED") end
      loot("|Hitem:2447::|h[Pacifique]|h", "|Hitem:2447::|h[Pacifique]|h")
      loot("|Hitem:2770::|h[Minerai de cuivre]|h", "|Hitem:2835::|h[Pierre brute]|h")
      loot("|Hitem:2318::|h[Cuir léger]|h")
      loot("|Hitem:4865::|h[Griffe ébréchée]|h")
      loot("|Hitem:2447::|h[Pacifique]|h")
    `);
    const gathered = Object.fromEntries(
      outbox(client).map((reading) => {
        const { type, value } = reading as { type: string; value: number };
        return [type, value];
      }),
    );
    expect(gathered).toMatchObject({ herbalism: 2, mining: 1, skinning: 1 });
  });

  it("says when a quest counts what this addon does not read", () => {
    const newer = {
      ...GUILD_QUESTS,
      missions: [{ mission: mission("q2", "cooking" as "fishing", "Le Chef"), scores: [], rewards: [] }],
    };
    const { client } = startQuests({ facts: newer });
    client(OPEN_TAB("Quêtes"));
    expect(plain(client(ROWS()))).toContain(
      "Ce compteur n'est pas lu en jeu : le site compte les relevés du compagnon.",
    );
  });

  it("shows the quest on the Taverne's card and in the reduced mode", () => {
    const { client } = startQuests();
    client(OPEN_TAB("Taverne"));
    expect(
      client(`return FindWidget(VXV_Window, function(w) return w.text == "Le Chasseur de têtes" end) ~= nil`),
    ).toBe(true);
    client('VXV_Window.reduce:Run("OnClick")');
    client(
      'FindWidget(VXV_CompactWindow, function(w) return w.SetSelected and w.label.text == "Quêtes" end):Run("OnClick")',
    );
    expect(plain(client(ROWS("VXV_CompactWindow")))[0]).toBe("Le Chasseur de têtes");
  });

  it("passes the quests on from an officer, who relays the counters of a member without companion", () => {
    const guild = startGuild(["Thom Leboss"], { bundles: ["VXV_Missions", "VXV_Sync"] });
    guild.join("Ðéjà Vu", { written: companionFiles({ quetes: questsText() }) });
    for (let carried = 1; carried > 0;) {
      guild.advanceTime(5);
      carried = guild.deliver();
    }
    const thom = guild.player("Thom Leboss");
    thom.client(OPEN_TAB("Quêtes"));
    expect(plain(thom.client(ROWS()))[0]).toBe("Le Chasseur de têtes");
    thom.client("Counters.honorableKills = 40");
    guild.advanceTime(60);
    guild.deliver();
    expect(outbox(guild.player("Ðéjà Vu").client)).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Thom Leboss", type: "honorableKills", value: 40 })]),
    );
  });
});
