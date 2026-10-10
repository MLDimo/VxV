import { formatAddonRanking, type AddonRankingFacts } from "@vxv/server/domain/addonRanking";
import { describe, expect, it } from "vitest";
import { startCore } from "../core.ts";
import { GUILD_READERS } from "../siteFixtures.ts";
import { companionFiles } from "../sync/fixtures.ts";

const BUNDLES = ["Ranking", "Sync"];
const member = (memberId: string, name: string, characterClass: string, avatar?: string, title?: string) => ({
  memberId,
  name,
  characterClass,
  avatar,
  title,
});
/** Season 2's boards: Vorn leads the bettors, Thom Leboss (the player) comes fifth; Ciel Gris leads the deathroll. */
const BOARDS: AddonRankingFacts = {
  ...GUILD_READERS,
  exportedAt: new Date("2026-12-10T07:00:00Z"),
  seasonNumber: 2,
  members: [
    member("m-vorn", "Vorn Cendrelune", "WARRIOR", "orc_guerrier_m", "Roi du gambling"),
    member("m-thessa", "Thessa Lune", "DRUID", "tauren_druide_m"),
    member("m-kaelys", "Kaelys Brume", "MAGE", "troll_mage_m", "Il cheat c'est sûr"),
    member("m-sira", "Sira Ventargent", "HUNTER", undefined, "Numéro UNO"),
    member("m-thom", "Thom Leboss", "ROGUE", "mv_voleur_m"),
    member("m-ciel", "Ciel Gris", "PRIEST", "mv_pretre_f"),
  ],
  boards: [
    {
      category: "paris",
      period: "season",
      metric: "gain net",
      unit: "gold",
      rows: [
        { rank: 1, memberId: "m-vorn", value: 3215 },
        { rank: 2, memberId: "m-thessa", value: 1840 },
        { rank: 3, memberId: "m-kaelys", value: 1120 },
        { rank: 4, memberId: "m-sira", value: 120 },
        { rank: 5, memberId: "m-thom", value: -960 },
      ],
      records: [
        { label: "Plus gros gain", value: "+900 po", memberId: "m-vorn" },
        { label: "Plus grosse perte", value: "−680 po", memberId: "m-thom" },
        { label: "Paris joués", value: "148", memberId: "m-thessa" },
      ],
    },
    {
      category: "deathroll",
      period: "season",
      metric: "gain net",
      unit: "gold",
      rows: [{ rank: 1, memberId: "m-ciel", value: 500 }],
      records: [],
    },
    { category: "paris", period: "always", metric: "gain net", unit: "gold", rows: [], records: [] },
  ],
};
const OPEN_RANKING = `
  SlashCmdList.VXV("")
  FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "Ranking" end):Run("OnClick")
`;
/** The texts shown on screen, without their colors. */
const SHOWN = `
  local texts = {}
  FindWidget(VXV_Window, function(widget)
    if type(widget.text) == "string" and widget.text ~= "" and IsVisible(widget) then texts[#texts + 1] = widget.text end
  end)
  return texts
`;
const plain = (texts: unknown) => (texts as string[]).map((text) => text.replace(/\|c\w{8}(.*?)\|r/gu, "$1"));
const CLICK = (label: string) =>
  `FindWidget(VXV_Window, function(widget) return widget.label and widget.label.text == ${JSON.stringify(label)} and IsVisible(widget) end):Run("OnClick")`;

function startRanking() {
  const started = startCore({
    playerName: "Thom Leboss",
    written: companionFiles({ ranking: formatAddonRanking(BOARDS) }),
    bundles: BUNDLES,
  });
  started.client(OPEN_RANKING);
  return started;
}

describe("the Ranking in game (§7.5)", () => {
  it("shows the season's bettors on banners, the records, the following places and the player's own", () => {
    const { client, errors } = startRanking();
    const shown = plain(client(SHOWN));
    for (const text of ["Paris", "Deathroll", "Quêtes", "Titres", "Toujours", "Mois", "Saison 2"]) {
      expect(shown).toContain(text);
    }
    // The podium: Vorn first in gold, with his title and his gain.
    for (const text of ["OR", "ARGENT", "BRONZE", "Vorn", "◆ Roi du gambling", "+3 215 po", "Thessa", "+1 840 po"]) {
      expect(shown).toContain(text);
    }
    // The records, then the following places, the player's own at the bottom.
    for (const text of ["Records de la saison", "PLUS GROS GAIN", "+900 po", "Vorn Cendrelune", "Thessa Lune"]) {
      expect(shown).toContain(text);
    }
    expect(shown).toContain("gain net · Saison 2");
    expect(shown).toContain("Sira Ventargent");
    expect(shown).toContain("◆ Numéro UNO");
    expect(shown).toContain("+120");
    expect(shown).toContain("Toi · Thom Leboss");
    expect(shown).toContain("ta position");
    expect(shown).toContain("−960");
    // The portraits come from the bundle's media.
    const portrait = client(`return FindWidget(VXV_Window, function(widget)
      return type(widget.path) == "string" and widget.path:find("orc_guerrier_m", 1, true) ~= nil end) ~= nil`);
    expect(portrait).toBe(true);
    expect(errors()).toEqual([]);
  });

  it("changes the board with the categories and the periods", () => {
    const { client, errors } = startRanking();
    client(CLICK("Deathroll"));
    expect(plain(client(SHOWN))).toContain("Ciel");
    client(CLICK("Paris"));
    client(CLICK("Toujours"));
    const shown = plain(client(SHOWN));
    expect(shown).toContain("Personne au classement sur cette période.");
    expect(shown).toContain("Records depuis toujours");
    expect(shown).not.toContain("Vorn");
    expect(errors()).toEqual([]);
  });

  it("says where the boards come from before any data", () => {
    const { client } = startCore({ bundles: BUNDLES });
    client(OPEN_RANKING);
    expect(plain(client(SHOWN))).toContain(
      "Aucun classement : ton compagnon VXV l'apporte, ou un officier le transmet à la guilde.",
    );
  });
});
