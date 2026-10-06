import { formatAddonTitles, type AddonTitlesFacts } from "@vxv/server/domain/addonTitles";
import type { Character } from "@vxv/server/domain/characters";
import { TITLES } from "@vxv/server/domain/titles";
import { describe, expect, it } from "vitest";
import { startCore } from "../core.ts";
import { startGuild } from "../guild.ts";
import { parisText } from "../paris/fixtures.ts";
import { companionFiles } from "../sync/fixtures.ts";

const BUNDLES = ["VXV_Titles", "VXV_Sync"];

function character(firstName: string, lastName: string, memberId: string): Character {
  return { id: `c-${firstName}`, firstName, lastName, characterClass: "PRIEST", memberId, isMain: true, inGuild: true };
}

/** The titles of the week: Thom Leboss (main and reroll) is Roi du gambling and Sugar Daddy, Bien gras goes to nobody. */
const WEEK: AddonTitlesFacts = {
  officers: [character("Ðéjà", "Vu", "m-deja")],
  characters: [
    character("Ðéjà", "Vu", "m-deja"),
    character("Thom", "Leboss", "m-thom"),
    { ...character("Thom", "Reroll", "m-thom"), isMain: false },
  ],
  holders: [
    { titleId: "gamblingKing", memberId: "m-thom", memberName: "Thom Leboss", memberClass: "PRIEST", score: 300 },
    { titleId: "sugarDaddy", memberId: "m-thom", memberName: "Thom Leboss", memberClass: "PRIEST", score: 500 },
  ],
  exportedAt: new Date("2026-12-09T05:00:00Z"),
};
const OPEN_TAB = (name: string) => `
  SlashCmdList.VXV("")
  FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "${name}" end):Run("OnClick")
`;
const ROWS = `
  local texts = {}
  FindWidget(VXV_Window, function(widget)
      if widget.row ~= nil and widget.shown then texts[#texts + 1] = widget.label.text end
  end)
  return texts
`;
/** The rows shown on screen: those of the selected tab of a place. */
const VISIBLE_ROWS = `
  local texts = {}
  FindWidget(VXV_Window, function(widget)
      if widget.row ~= nil and IsVisible(widget) then texts[#texts + 1] = widget.label.text end
  end)
  return texts
`;
/** The texts without their colors. */
const plain = (texts: unknown) => (texts as string[]).map((text) => text.replace(/\|c\w{8}(.*?)\|r/gu, "$1"));
const TAG = "[◆ Roi du gambling · ◆ Sugar Daddy]";

function startTitles(facts: AddonTitlesFacts = WEEK) {
  return startCore({ written: companionFiles({ titres: formatAddonTitles(facts) }), bundles: BUNDLES });
}

describe("the titles in game (P13.3, P13.4)", () => {
  it("shows the titles of the week in the Ranking, with their holder or nobody", () => {
    const { client, errors } = startTitles();
    client(OPEN_TAB("Ranking"));
    const rows = plain(client(ROWS));
    expect(rows).toHaveLength(TITLES.length);
    expect(rows[0]).toBe("◆ Roi du gambling  Thom Leboss");
    expect(rows).toContain("◆ Bien gras  Personne cette semaine");
    expect(errors()).toEqual([]);
  });

  it("shows the Ranking's three tabs, the bettors first, then the deathroll and the titles", () => {
    const { client, errors } = startCore({
      written: companionFiles({ titres: formatAddonTitles(WEEK), paris: parisText() }),
      bundles: ["VXV_Titles", "VXV_Paris", "VXV_Deathroll", "VXV_Sync"],
    });
    client(OPEN_TAB("Ranking"));
    const tabs = client(`
      local names = {}
      FindWidget(VXV_Window, function(widget)
        if widget.SetSelected and widget.label and widget.label.text ~= nil and widget.parent ~= VXV_Window.header then
          names[#names + 1] = widget.label.text
        end
      end)
      return names`);
    expect(tabs).toEqual(["Paris", "Deathroll", "Titres"]);
    expect(plain(client(VISIBLE_ROWS))).toEqual(["1. Thom Leboss · +30 po · 2 paris"]);
    client(`FindWidget(VXV_Window, function(widget)
      return widget.SetSelected and widget.label and widget.label.text == "Titres"
    end):Run("OnClick")`);
    expect(plain(client(VISIBLE_ROWS))).toContain("◆ Roi du gambling  Thom Leboss");
    expect(errors()).toEqual([]);
  });

  it("adds a member's titles to their tooltip, their guild messages and their name in the guild list", () => {
    const { client, errors } = startTitles();
    client('Units.target = "Thom Reroll" Units.mouseover = "Ciel Gris"');
    expect(plain(client('return UnitTooltip("target")'))).toEqual(["◆ Roi du gambling", "◆ Sugar Daddy"]);
    expect(client('return UnitTooltip("mouseover")')).toEqual({});
    expect(plain([client('return ChatShows("CHAT_MSG_GUILD", "salut", "Thom Leboss")')])).toEqual([`${TAG} salut`]);
    expect(client('return ChatShows("CHAT_MSG_GUILD", "salut", "Ciel Gris")')).toBe("salut");
    // A secret message goes on untouched.
    expect(client('return ChatShows("CHAT_MSG_GUILD", SECRET, "Thom Leboss") == SECRET')).toBe(true);
    expect(plain([client('return GuildRowShows("Thom Leboss")')])).toEqual([`Thom Leboss ${TAG}`]);
    expect(client('return GuildRowShows("Ciel Gris")')).toBe("Ciel Gris");
    expect(errors()).toEqual([]);
  });

  it("brings the titles to the members without companion through an officer's addon", () => {
    const guild = startGuild(["Thom Leboss"], { bundles: BUNDLES });
    guild.join("Ðéjà Vu", { written: companionFiles({ titres: formatAddonTitles(WEEK) }) });
    for (let carried = 1; carried > 0;) {
      guild.advanceTime(5);
      carried = guild.deliver();
    }
    const thom = guild.player("Thom Leboss");
    expect(plain(thom.client('return UnitTooltip("player")'))).toEqual(["◆ Roi du gambling", "◆ Sugar Daddy"]);
    expect(thom.errors()).toEqual([]);
  });

  it("shows a title the website adds, without any update of the addon (P13.6)", () => {
    const text = `${formatAddonTitles(WEEK)}\nT;newTitle;Le Nouveau;Une règle à venir.;m-thom;Thom Leboss;PRIEST;7`;
    const { client } = startCore({ written: companionFiles({ titres: text }), bundles: BUNDLES });
    expect(plain(client('Units.target = "Thom Leboss" return UnitTooltip("target")'))).toContain("◆ Le Nouveau");
  });
});
