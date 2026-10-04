import { describe, expect, it } from "vitest";
import { startCore } from "../core.ts";

/** The window's state as the player would see it: shown or not, its tabs, the text of the selected one. */
const WINDOW = `
  local window = VXV_Window
  if window == nil then return { exists = false } end
  local tabs, texts = {}, {}
  for _, child in ipairs(window.children) do
      if child.kind == "Button" then tabs[#tabs + 1] = child:GetText() end
      if child.kind == "Frame" and child:IsShown() then
          for _, region in ipairs(child.children) do texts[#texts + 1] = region:GetText() end
      end
  end
  return { exists = true, shown = window:IsShown(), tabs = tabs, texts = texts }
`;
/** The minimap icon: the last offset it was placed at, from the minimap's center. */
const ICON_OFFSET = `
  local icon = Minimap.children[#Minimap.children]
  local _, _, _, x, y = icon:GetPoint()
  return { math.floor(x + 0.5), math.floor(y + 0.5) }
`;

describe("VXV_Core interface", () => {
  it("opens and closes the window with /vxv, on the home tab, closable with Escape", () => {
    const { client } = startCore();
    expect(client(WINDOW)).toEqual({ exists: false });
    client('SlashCmdList.VXV("")');
    expect(client(WINDOW)).toEqual({
      exists: true,
      shown: true,
      tabs: ["Accueil"],
      texts: ["VXV @project-version@", expect.stringContaining("Raids, soft reserves et loot")],
    });
    expect(client("return UISpecialFrames")).toEqual(["VXV_Window"]);
    client('SlashCmdList.VXV("")');
    expect(client("return VXV_Window:IsShown()")).toBe(false);
  });

  it("lists the commands with /vxv aide, and for any unknown command", () => {
    const { client } = startCore();
    client('SlashCmdList.VXV("aide")');
    client('SlashCmdList.VXV("inconnue")');
    expect(client("return Printed")).toEqual([
      "|cff14b8a6VXV|r /vxv : ouvrir ou fermer la fenêtre",
      "|cff14b8a6VXV|r /vxv aide : afficher ces commandes",
      "|cff14b8a6VXV|r /vxv : ouvrir ou fermer la fenêtre",
      "|cff14b8a6VXV|r /vxv aide : afficher ces commandes",
    ]);
  });

  it("reopens the window where the player left it", () => {
    const saved =
      '{ schemaVersion = 2, modules = {}, ui = { window = { point = "TOPLEFT", relativePoint = "TOPLEFT", x = 40, y = -60 } } }';
    const { client } = startCore({ savedVariables: saved });
    client('SlashCmdList.VXV("")');
    expect(client("return { select(1, VXV_Window:GetPoint()), select(3, VXV_Window:GetPoint()) }")).toEqual([
      "TOPLEFT",
      "TOPLEFT",
      40,
      -60,
    ]);
  });

  it("adds the tab of a module loaded after the window was opened", () => {
    const { core, client } = startCore();
    client('SlashCmdList.VXV("")');
    core.run('VXV.RegisterModule({ id = "raid", tab = { title = "Raid", Build = function() end } })');
    expect(client(WINDOW)).toMatchObject({ tabs: ["Accueil", "Raid"] });
  });

  it("opens in combat without any error: nothing in VXV's window is protected", () => {
    const { client, errors } = startCore();
    client("InCombat = true");
    client('SlashCmdList.VXV("")');
    expect(errors()).toEqual([]);
  });

  describe("minimap icon", () => {
    it("is placed at the default angle on a first installation, around a round minimap", () => {
      const { client, errors } = startCore();
      // 225 degrees on a 140 pixels minimap: (cos, sin) x (70 + 5).
      expect(client(ICON_OFFSET)).toEqual([-53, -53]);
      expect(errors()).toEqual([]);
    });

    it("follows the square corners of a minimap addon that tells its shape", () => {
      const { core } = startCore({ beforeLogin: true });
      core.run('GetMinimapShape = function() return "SQUARE" end');
      core.run('Fire("PLAYER_LOGIN")');
      // Pushed towards the square's corner, 10 pixels inside it: (sqrt(2) x 75 - 10) x cos(225), instead of -53.
      expect(core.run(ICON_OFFSET)).toEqual([-68, -68]);
    });

    it("is dragged around the minimap and keeps its new place", () => {
      const { client } = startCore();
      client(`
        local icon = Minimap.children[#Minimap.children]
        Cursor.x, Cursor.y = 1100, 700
        icon:Run("OnDragStart")
        icon:Run("OnUpdate")
        icon:Run("OnDragStop")
      `);
      expect(client("return VXV_DB.ui.minimap.angle")).toBe(0);
      expect(client(ICON_OFFSET)).toEqual([75, 0]);
      expect(client("return Minimap.children[#Minimap.children]:GetScript('OnUpdate')")).toBeUndefined();
    });

    it("opens the window on click, and explains itself in the tooltip", () => {
      const { client } = startCore();
      client("Minimap.children[#Minimap.children]:Run('OnEnter')");
      expect(client("return GameTooltip.lines")).toEqual([
        "Clic : ouvrir ou fermer la fenêtre",
        "Glisser : déplacer l'icône",
      ]);
      client("Minimap.children[#Minimap.children]:Run('OnClick')");
      expect(client("return VXV_Window:IsShown()")).toBe(true);
    });

    it("is also listed in the addon compartment of a client that has one", () => {
      const { core, client } = startCore({ beforeLogin: true });
      core.run(
        "AddonCompartmentFrame = { entries = {}, RegisterAddon = function(self, entry) self.entries[#self.entries + 1] = entry.text end }",
      );
      client('Fire("PLAYER_LOGIN")');
      expect(client("return AddonCompartmentFrame.entries")).toEqual(["VXV"]);
    });
  });
});
