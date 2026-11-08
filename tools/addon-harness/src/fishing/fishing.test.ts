import { describe, expect, it } from "vitest";
import { loadedBundle, startCore } from "../core.ts";

/** Lua: a character who fishes. */
const FISHER = 'Professions = { { id = 356, name = "Pêche", level = 75, max = 150, recipes = {} } }';
/** Lua: a pole and a lure in the bags, a sword and a shield in hand. */
const GEAR = `
  ItemInfo[6256] = { name = "Canne à pêche", classID = 2, subclassID = 20, equipLoc = "INVTYPE_2HWEAPON" }
  ItemInfo[25] = { name = "Vieille épée courte", classID = 2, subclassID = 7, equipLoc = "INVTYPE_WEAPON" }
  ItemInfo[2362] = { name = "Vieux bouclier en bois", classID = 4, subclassID = 6, equipLoc = "INVTYPE_SHIELD" }
  ItemInfo[6529] = { name = "Verroterie brillante", classID = 0, subclassID = 8 }
  ItemInfo[6303] = { name = "Saumon gris cru", classID = 0, subclassID = 5 }
  Bags[0] = { 6256, 6529 }
  Hands[16], Hands[17] = 25, 2362
`;
const START = 'SlashCmdList.VXV("peche")';
/** Lua: the player in Durotar, and the game's texts of a refused cast (French client). */
const WATERS = `
  Zone = { map = 1411, name = "Durotar" }
  C_Map = { GetBestMapForUnit = function() return Zone.map end, GetMapInfo = function() return { name = Zone.name } end }
  SPELL_FAILED_LOW_CASTLEVEL = "Niveau de la technique insuffisant"
  SPELL_FAILED_FISHING_TOO_LOW = "Pêche (%d) requise"
  SPELL_FAILED_NOT_FISHABLE = "Votre ligne n'est pas tombée dans une eau poissonneuse"
`;
const REFUSED = (text: string) =>
  `Fire("UNIT_SPELLCAST_FAILED", "player", "Cast-2", 7620) Fire("UI_ERROR_MESSAGE", 57, ${JSON.stringify(text)})`;
const CAST = 'Fire("UNIT_SPELLCAST_CHANNEL_START", "player", "Cast-1", 7620)';
const LINE_OUT = 'Fire("UNIT_SPELLCAST_CHANNEL_STOP", "player", "Cast-1", 7620)';
const CATCH = `${LINE_OUT} CorpseLinks = { ItemLink(6303, "Saumon gris cru") } Fire("LOOT_OPENED")`;
const QUIT = 'FindButton(VXV_FishingWindow, "Quitter la session"):Run("OnClick")';
const OPEN_ARTISANS = `
  SlashCmdList.VXV("")
  FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "Artisans" end):Run("OnClick")
`;
/** Lua: the texts shown under a frame, depth first. */
const SHOWN = (frame: string) => `
  local texts = {}
  local function walk(widget)
      for _, child in ipairs(widget.children or {}) do
          if child.text ~= nil and IsVisible(child) then texts[#texts + 1] = child.text end
          walk(child)
      end
  end
  walk(${frame})
  return texts
`;

function startFishing({ fisher = true, gear = true, savedVariables }: Partial<Record<string, unknown>> = {}) {
  const started = startCore({
    beforeLogin: true,
    bundles: ["Fishing"],
    savedVariables: savedVariables as string | undefined,
  });
  started.client(`${fisher ? FISHER : ""} ${gear ? GEAR : ""} Fire("PLAYER_LOGIN")`);
  const fishing = loadedBundle(started, "Fishing");
  return { ...started, fishing, state: () => fishing.run("local _, ns = ... return (ns.Session.State())") };
}

const shown = (client: (code: string) => unknown, frame: string) => client(SHOWN(frame)) as string[];

describe("fishing in one button (Artisans › Pêche)", () => {
  it("takes the pole, keeps the weapons, binds the key to the fishing button and opens the session's window", () => {
    const { client, state, errors } = startFishing();
    client(START);
    expect(state()).toBe("ready");
    expect(client("return Hands[16]")).toBe(6256);
    expect(client("return Hands[17]")).toBeUndefined();
    expect(client("return Bindings.F")).toBe("CLICK VXV_FishingButton:LeftButton");
    expect(client("return VXV_FishingButton.attributes.macrotext")).toBe(
      "/cast [nocombat] Pêche\n/equip [combat] Vieille épée courte\n/equipslot [combat] 17 Vieux bouclier en bois",
    );
    expect(client("return VXV_FishingWindow.shown")).toBe(true);
    expect(shown(client, "VXV_FishingWindow")).toEqual(
      expect.arrayContaining(["Session de pêche", "Pêcher", "Canne équipée · prête", "F", "0 prises · 00:00"]),
    );
    expect(errors()).toEqual([]);
  });

  it("hooks the bobber with the same key while the line is in the water, then shows the catch and casts again", () => {
    const { client, state } = startFishing();
    client(START);
    client(CAST);
    expect(state()).toBe("fishing");
    expect(client("return Bindings.F")).toBe("INTERACTTARGET");
    expect(client("return VXV_FishingButton.label.text")).toBe("Ferrer");
    client(CATCH);
    expect(client("return Bindings.F")).toBe("CLICK VXV_FishingButton:LeftButton");
    expect(state()).toBe("caught");
    expect(shown(client, "VXV_FishingWindow")).toEqual(
      expect.arrayContaining(["Prise !", "+1 · Saumon gris cru", "1 prise · 00:00"]),
    );
    client("AdvanceTime(2)");
    expect(state()).toBe("ready");
  });

  it("counts the catch when the loot window opens before the line's end", () => {
    const { client, state } = startFishing();
    client(`${START} ${CAST} CorpseLinks = { ItemLink(6303, "Saumon gris cru") } Fire("LOOT_OPENED") ${LINE_OUT}`);
    expect(state()).toBe("caught");
    expect(client("return Bindings.F")).toBe("CLICK VXV_FishingButton:LeftButton");
  });

  it("counts nothing when the line comes out empty", () => {
    const { client, state, fishing } = startFishing();
    client(START);
    client(`${CAST} ${LINE_OUT} AdvanceTime(1)`);
    expect(state()).toBe("ready");
    expect(fishing.run("local _, ns = ... local _, data = ns.Session.State() return data.catches")).toBe(0);
  });

  it("gives the weapons and the key back when the player quits, and shows the session's summary", () => {
    const { client, state } = startFishing();
    client(`${START} ${CAST} ${CATCH} AdvanceTime(2)`);
    client(QUIT);
    expect(state()).toBe("off");
    expect(client("return Hands[16]")).toBe(25);
    expect(client("return Hands[17]")).toBe(2362);
    expect(client("return next(Bindings)")).toBeUndefined();
    expect(shown(client, "VXV_FishingWindow")).toEqual(
      expect.arrayContaining(["Session terminée", "1", "Meilleure prise : Saumon gris cru", "Arme rééquipée"]),
    );
  });

  it("gives the weapons back when a fight starts, and ends the session once the fight is over", () => {
    const { client, state } = startFishing();
    client(`${START} InCombat = true Fire("PLAYER_REGEN_DISABLED") AdvanceTime(1)`);
    expect(client("return Hands[16]")).toBe(25);
    expect(state()).toBe("fight");
    expect(shown(client, "VXV_FishingWindow")).toContain("Combat ! Session fermée, arme rééquipée");
    // Quitting during the fight waits for its end: the window holds secure buttons.
    client(START);
    expect(state()).toBe("fight");
    client("InCombat = false AdvanceTime(5)");
    expect(state()).toBe("off");
    expect(client("return next(Bindings)")).toBeUndefined();
  });

  it("tells the player to press the key when the game refuses to equip during a fight, and equips after it", () => {
    const { client, state } = startFishing();
    client(`EquipInFight = false ${START} InCombat = true Fire("PLAYER_REGEN_DISABLED") AdvanceTime(1)`);
    expect(client("return Hands[16]")).toBe(6256);
    expect(shown(client, "VXV_FishingWindow")).toEqual(
      expect.arrayContaining(["Combat ! Appuie sur F pour reprendre ton arme", "Reprendre l'arme"]),
    );
    client("InCombat = false AdvanceTime(5)");
    expect(state()).toBe("off");
    expect(client("return Hands[16]")).toBe(25);
  });

  it("gives back the weapons of a session cut short by a /reload", () => {
    const { client } = startCore({
      beforeLogin: true,
      bundles: ["Fishing"],
      savedVariables: "{ schemaVersion = 2, ui = {}, modules = { fishing = { weapons = { main = 25, off = 2362 } } } }",
    });
    client(`${FISHER} ${GEAR} Hands[16], Hands[17] = 6256, nil Fire("PLAYER_LOGIN")`);
    expect(client("return Hands[16]")).toBe(25);
    expect(client("return Hands[17]")).toBe(2362);
    expect(client("return VXV_DB.modules.fishing.weapons")).toBeUndefined();
  });

  it("puts the bags' lure on the pole with its button, and shows the lure's time left", () => {
    const { client } = startFishing();
    client(START);
    const lure = client(`
      return FindWidget(VXV_FishingWindow, function(widget)
          return widget.attributes ~= nil and widget ~= VXV_FishingButton
      end).attributes.macrotext
    `);
    expect(lure).toBe("/use Verroterie brillante\n/use 16");
    client("Lure.on, Lure.ms = true, 420000 AdvanceTime(0.2)");
    expect(shown(client, "VXV_FishingWindow")).toContain("Appât posé · 7 min");
  });

  it("stops at the first cast refused for the level, then no longer starts in that zone below it", () => {
    const { client, state } = startFishing();
    client(`${WATERS} ${START}`);
    client(REFUSED("Niveau de la technique insuffisant"));
    expect(state()).toBe("off");
    expect(client("return Hands[16]")).toBe(25);
    expect(shown(client, "VXV_FishingWindow")).toContain(
      "Eau trop difficile (Durotar) : il faut la Pêche à 76, la tienne est à 75",
    );
    expect(client('return VXV_DB.modules.fishing.waters["map:1411"]')).toBe(76);
    client(START);
    expect(state()).toBe("off");
    expect(client("return Hands[16]")).toBe(25);
    client(OPEN_ARTISANS);
    expect(shown(client, "VXV_Window")).toContain(
      "Eau trop difficile (Durotar) : il faut la Pêche à 76, la tienne est à 75",
    );
    // Elsewhere, the session starts.
    client(`Zone = { map = 1412, name = "Mulgore" } ${START}`);
    expect(state()).toBe("ready");
  });

  it("learns the level the game asks for when it tells it", () => {
    const { client } = startFishing();
    client(`${WATERS} ${START}`);
    client(REFUSED("Pêche (150) requise"));
    expect(client('return VXV_DB.modules.fishing.waters["map:1411"]')).toBe(150);
  });

  it("greys the button when the line lands out of the water, until the next cast", () => {
    const { client, state } = startFishing();
    client(`${WATERS} ${START}`);
    client(REFUSED("Votre ligne n'est pas tombée dans une eau poissonneuse"));
    expect(state()).toBe("ready");
    expect(shown(client, "VXV_FishingWindow")).toEqual(
      expect.arrayContaining(["Trop loin de l'eau", "Ta ligne n'a pas touché l'eau : approche-toi et relance"]),
    );
    client(CAST);
    expect(shown(client, "VXV_FishingWindow")).not.toContain("Trop loin de l'eau");
  });

  it("is only for a character who fishes", () => {
    const { client, state } = startFishing({ fisher: false });
    client(START);
    expect(state()).toBe("off");
    expect(client("return Hands[16]")).toBe(25);
    client(OPEN_ARTISANS);
    expect(shown(client, "VXV_Window").some((text) => text.startsWith("Ce personnage ne pêche pas"))).toBe(true);
  });

  it("says why a session cannot start: no pole in the bags", () => {
    const { client, state } = startFishing();
    client("Bags[0] = {}");
    client(OPEN_ARTISANS);
    client('FindButton(VXV_Window, "Lancer une session de pêche"):Run("OnClick")');
    expect(state()).toBe("off");
    expect(shown(client, "VXV_Window")).toContain("Aucune canne à pêche dans tes sacs");
  });

  it("lets the player choose the fishing key in the Artisans screen", () => {
    const { client } = startFishing();
    client(OPEN_ARTISANS);
    client('FindButton(VXV_Window, "Changer"):Run("OnClick")');
    expect(shown(client, "VXV_Window")).toContain("Appuie sur une touche… (Échap pour annuler)");
    client(`
      local capture = FindWidget(VXV_Window, function(widget) return widget.scripts and widget.scripts.OnKeyDown end)
      capture:Run("OnKeyDown", "LSHIFT")
      capture:Run("OnKeyDown", "G")
    `);
    client(START);
    expect(client("return Bindings.G")).toBe("CLICK VXV_FishingButton:LeftButton");
    expect(client("return Bindings.F")).toBeUndefined();
  });

  it("is the Artisans place's second tab, after the directory", () => {
    const started = startCore({ bundles: ["Artisans", "Fishing"] });
    started.client(OPEN_ARTISANS);
    const tabs = started.client(`
      local labels = {}
      FindWidget(VXV_Window, function(widget)
          if widget.SetSelected and widget.label and (widget.label.text == "Annuaire" or widget.label.text == "Pêche") then
              labels[#labels + 1] = widget.label.text
          end
      end)
      return labels
    `);
    expect(tabs).toEqual(["Annuaire", "Pêche"]);
  });
});
