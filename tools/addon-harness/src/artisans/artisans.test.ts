import { formatAddonArtisans } from "@vxv/server/domain/addonArtisans";
import { parseProfessions } from "@vxv/server/domain/artisans";
import type { Character } from "@vxv/server/domain/characters";
import { describe, expect, it } from "vitest";
import { loadedBundle, startCore } from "../core.ts";
import { startGuild } from "../guild.ts";
import { companionFiles } from "../sync/fixtures.ts";

const BUNDLES = ["VXV_Artisans", "VXV_Sync"];
/** Lua: Thom's professions, his first aid's window holding two learned recipes and one he has not learned. */
const FIRST_AID = `
  Professions = {
    { id = 129, name = "Secourisme", level = 22, max = 75, recipes = {
      [3275] = { name = "Bandage en lin", learned = true },
      [1244431] = { name = "Potion de soins mineure", learned = true },
      [3276] = { name = "Bandage épais en lin", learned = false },
    } },
    { id = 185, name = "Cuisine", level = 6, max = 75, recipes = {
      [8604] = { name = "Œufs aux herbes", learned = true },
    } },
  }
`;
const OPEN = (index: number) =>
  `ShownProfession = Professions[${String(index)}] Fire("TRADE_SKILL_SHOW") AdvanceTime(2)`;
const SEARCH = (text: string) => `
  local _, ns = ...
  local found = {}
  for _, recipe in ipairs(ns.Directory.Search(${JSON.stringify(text)})) do
    local crafters = {}
    for _, entry in ipairs(recipe.crafters) do crafters[#crafters + 1] = entry.character .. " " .. entry.level end
    found[#found + 1] = recipe.name .. " : " .. table.concat(crafters, ", ")
  end
  return found
`;
const OPEN_TAB = `
  SlashCmdList.VXV("")
  FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "Artisans" end):Run("OnClick")
`;
const ROWS = `
  local texts = {}
  FindWidget(VXV_Window, function(widget)
      if widget.row ~= nil and widget.shown then texts[#texts + 1] = widget.label.text end
  end)
  return texts
`;
/** The texts without their colors. */
const plain = (texts: unknown) => (texts as string[]).map((text) => text.replace(/\|c\w{8}(.*?)\|r/gu, "$1"));

/** Plays until no message is left to carry. */
function settle(guild: ReturnType<typeof startGuild>): void {
  for (let carried = 1; carried > 0;) {
    guild.advanceTime(5);
    carried = guild.deliver();
  }
}

describe("the artisans in game (P14)", () => {
  it("reads the levels at login and the learned recipes at the window's opening, for the website (VXV-METIERS-1)", () => {
    const { client, errors } = startCore({
      playerName: "Thom Leboss",
      beforeLogin: true,
      written: companionFiles({}),
      bundles: BUNDLES,
    });
    client(`${FIRST_AID} Fire("PLAYER_LOGIN")`);
    client(OPEN(1));
    const sent = parseProfessions(client('return VXV_SyncDB.texts.metiers["Thom Leboss"]') as string);
    expect(sent.character).toBe("Thom Leboss");
    expect(
      sent.professions.map(({ name, level, recipes }) => [name, level, recipes?.list.map((recipe) => recipe.name)]),
    ).toEqual([
      ["Secourisme", 22, ["Bandage en lin", "Potion de soins mineure"]],
      ["Cuisine", 6, undefined],
    ]);
    expect(errors()).toEqual([]);
  });

  it("leaves aside a profession another player links (its level is not the player's)", () => {
    const { client, artisans } = startArtisans();
    client(
      "ShownProfession = { id = 129, name = 'Secourisme', level = 300, max = 300, recipes = { [99] = { name = 'Bandage runique', learned = true } } }",
    );
    client('Fire("TRADE_SKILL_SHOW") AdvanceTime(2)');
    expect(artisans.run(SEARCH("runique"))).toEqual({});
  });

  it("finds who can make an item, accents and case aside", () => {
    const { client, artisans } = startArtisans();
    client(OPEN(1));
    client(OPEN(2));
    expect(artisans.run(SEARCH("POTION soins"))).toEqual(["Potion de soins mineure : Thom Leboss 22"]);
    expect(artisans.run(SEARCH("oeufs"))).toEqual(["Œufs aux herbes : Thom Leboss 6"]);
    client(OPEN_TAB);
    client(
      `local field = FindWidget(VXV_Window, function(widget) return widget.maxLetters ~= nil end)
       field:SetText("bandage") field:Run("OnTextChanged")`,
    );
    expect(plain(client(ROWS))).toContain("Bandage en lin");
    expect(plain(client(ROWS))).toContain("Secourisme 22/75 · 2 recettes");
  });

  it("tells the guild: who is connected hears it, who logs in later asks for it", () => {
    const guild = startGuild(["Ciel Gris"], { bundles: BUNDLES });
    const thom = guild.join("Thom Leboss", { bundles: BUNDLES, beforeLogin: true });
    thom.client(`${FIRST_AID} Fire("PLAYER_LOGIN")`);
    settle(guild);
    thom.client(OPEN(1));
    settle(guild);
    const ciel = guild.player("Ciel Gris");
    expect(ciel.bundles.VXV_Artisans?.run(SEARCH("bandage"))).toEqual(["Bandage en lin : Thom Leboss 22"]);
    // Aube logs in after: she asks Thom's addon for what she misses.
    const aube = guild.join("Aube Claire", { bundles: BUNDLES });
    settle(guild);
    expect(aube.bundles.VXV_Artisans?.run(SEARCH("potion"))).toEqual(["Potion de soins mineure : Thom Leboss 22"]);
    for (const player of guild.players) {
      expect(player.errors()).toEqual([]);
    }
  });

  it("has an officer's companion take to the website the professions of a member without one", () => {
    const deja: Character = {
      id: "c0",
      firstName: "Ðéjà",
      lastName: "Vu",
      characterClass: "ROGUE",
      memberId: "m0",
      isMain: true,
      inGuild: true,
    };
    const directory = formatAddonArtisans({
      officers: [deja],
      characters: [deja],
      professions: [],
      recipes: [],
      known: [],
      exportedAt: new Date("2026-12-10T07:00:00Z"),
    });
    const guild = startGuild(["Thom Leboss"], { bundles: BUNDLES, beforeLogin: true });
    const thom = guild.player("Thom Leboss");
    thom.client(`${FIRST_AID} Fire("PLAYER_LOGIN")`);
    const officer = guild.join("Ðéjà Vu", { written: companionFiles({ artisans: directory }), beforeLogin: false });
    settle(guild);
    thom.client(OPEN(1));
    settle(guild);
    const relayed = parseProfessions(officer.client('return VXV_SyncDB.texts.metiers["Thom Leboss"]') as string);
    expect(relayed.professions.find((profession) => profession.name === "Secourisme")?.recipes?.list).toHaveLength(2);
    // Without the companion, Thom's addon keeps nothing for the website.
    expect(thom.client("return VXV_SyncDB.texts.metiers")).toBeUndefined();
  });

  it("knows the offline crafters from the directory the companion brings", () => {
    const sira: Character = {
      id: "c1",
      firstName: "Sira",
      lastName: "Ventargent",
      characterClass: "MAGE",
      memberId: "m1",
      isMain: true,
      inGuild: true,
    };
    const text = formatAddonArtisans({
      officers: [],
      characters: [sira],
      professions: [
        {
          characterId: "c1",
          characterName: "Sira Ventargent",
          characterClass: "MAGE",
          professionId: 197,
          name: "Couture",
          level: 150,
          maxLevel: 150,
          readAt: new Date("2026-12-09T20:00:00Z"),
          recipesReadAt: new Date("2026-12-09T20:00:00Z"),
        },
      ],
      recipes: [{ id: 3914, professionId: 197, name: "Chemise en lin brun" }],
      known: [{ characterId: "c1", professionId: 197, recipeId: 3914 }],
      exportedAt: new Date("2026-12-10T07:00:00Z"),
    });
    const { bundles } = startCore({ written: companionFiles({ artisans: text }), bundles: BUNDLES });
    expect(bundles.VXV_Artisans?.run(SEARCH("chemise"))).toEqual(["Chemise en lin brun : Sira Ventargent 150"]);
  });

  it("says in a recipe's tooltip whether the guild knows it, in green or in red (owner's request of 7 October)", () => {
    const { client, errors } = startArtisans();
    client(`
      ItemInfo[2455] = { name = "Recette : Potion de soins mineure", classID = 9, subclassID = 6 }
      ItemInfo[6454] = { name = "Manuel : Bandage épais en lin", classID = 9, subclassID = 7 }
      ItemInfo[118] = { name = "Potion de soins mineure", classID = 0, subclassID = 1 }
      ItemInfo[4500] = { name = "Livre : Secourisme expert", classID = 9, subclassID = 0 }
    `);
    const tooltip = (itemId: number) => client(`return ItemTooltip(${String(itemId)})`);
    const unknown = { text: "Recette non possédée par VXV", r: 0.945, g: 0.604, b: 0.604 };
    expect(tooltip(2455)).toEqual([unknown]);
    // Thom opens his first aid's window: the guild knows the potion now, not the thick bandage he has not learned.
    client(OPEN(1));
    expect(tooltip(2455)).toEqual([{ text: "Recette possédée par VXV", r: 0.494, g: 0.886, b: 0.627 }]);
    expect(tooltip(6454)).toEqual([unknown]);
    // Neither an item made by a recipe, nor a book, nor an item not in the client's cache yet.
    for (const itemId of [118, 4500, 9999]) {
      expect(tooltip(itemId)).toEqual({});
    }
    expect(errors()).toEqual([]);
  });
});

function startArtisans() {
  const started = startCore({ playerName: "Thom Leboss", beforeLogin: true, bundles: BUNDLES });
  started.client(`${FIRST_AID} Fire("PLAYER_LOGIN")`);
  return { ...started, artisans: loadedBundle(started, "VXV_Artisans") };
}
