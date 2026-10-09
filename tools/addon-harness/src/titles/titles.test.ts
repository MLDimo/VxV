import { formatAddonTitles, type AddonTitlesFacts } from "@vxv/server/domain/addonTitles";
import { describe, expect, it } from "vitest";
import { startCore } from "../core.ts";
import { startGuild } from "../guild.ts";
import { character } from "../siteFixtures.ts";
import { companionFiles } from "../sync/fixtures.ts";

const BUNDLES = ["VXV_Titles", "VXV_Sync"];

/** The titles of the week: Thom Leboss (main and reroll) is Roi du gambling and Sugar Daddy, Bien gras goes to nobody. */
const WEEK: AddonTitlesFacts = {
  officers: [character("Ðéjà", "Vu", "m-deja")],
  characters: [
    character("Ðéjà", "Vu", "m-deja"),
    character("Thom", "Leboss", "m-thom"),
    { ...character("Thom", "Reroll", "m-thom"), isMain: false },
  ],
  custom: [],
  holders: [
    { titleId: "gamblingKing", memberId: "m-thom", memberName: "Thom Leboss", memberClass: "PRIEST", score: 300 },
    { titleId: "sugarDaddy", memberId: "m-thom", memberName: "Thom Leboss", memberClass: "PRIEST", score: 500 },
  ],
  exportedAt: new Date("2026-12-09T05:00:00Z"),
};
/** The texts without their colors. */
const plain = (texts: unknown) => (texts as string[]).map((text) => text.replace(/\|c\w{8}(.*?)\|r/gu, "$1"));
const TAG = "[◆ Roi du gambling · ◆ Sugar Daddy]";

function startTitles(facts: AddonTitlesFacts = WEEK) {
  return startCore({ written: companionFiles({ titres: formatAddonTitles(facts) }), bundles: BUNDLES });
}

describe("the titles in game (P13.3, P13.4)", () => {
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
