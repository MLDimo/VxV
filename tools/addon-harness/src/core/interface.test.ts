import { describe, expect, it } from "vitest";
import { startCore } from "../core.ts";

/** The window's state as the player would see it: shown or not, its tabs, the texts of the selected screen. */
const WINDOW = `
  local window = VXV_Window
  if window == nil then return { exists = false } end
  local tabs, texts, selected = {}, {}, nil
  FindWidget(window.header, function(widget)
      if widget.SetSelected ~= nil then tabs[#tabs + 1] = widget.label:GetText() end
  end)
  for _, child in ipairs(window.children) do
      if child ~= window.header and child.kind == "Frame" and child:IsShown() then
          FindWidget(child, function(widget)
              if widget.kind == "FontString" and widget.text ~= nil then texts[#texts + 1] = widget.text end
          end)
      end
  end
  return { exists = true, shown = window:IsShown(), tabs = tabs, texts = texts }
`;
const TAB = (name: string) =>
  `FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "${name}" end)`;
const TABS = ["Taverne", "Raid", "Le Dé Pipé", "Quêtes", "Ranking", "Artisans", "Journal"];
/** The minimap icon: the last offset it was placed at, from the minimap's center. */
const ICON_OFFSET = `
  local icon = Minimap.children[#Minimap.children]
  local _, _, _, x, y = icon:GetPoint()
  return { math.floor(x + 0.5), math.floor(y + 0.5) }
`;

describe("VXV_Core interface", () => {
  it("opens and closes the window with /vxv, on the Taverne, one tab per place, closable with Escape", () => {
    const { client } = startCore();
    expect(client(WINDOW)).toEqual({ exists: false });
    client('SlashCmdList.VXV("")');
    expect(client(WINDOW)).toMatchObject({ exists: true, shown: true, tabs: TABS });
    expect((client(WINDOW) as { texts: string[] }).texts).toEqual(
      expect.arrayContaining([
        "Raid",
        "Journal",
        "VXV @project-version@ · Connectés avec VXV (1) : Ðéjà Vu",
        "Survole un lieu pour l'éclairer · clique pour entrer",
      ]),
    );
    expect(client("return UISpecialFrames")).toEqual(["VXV_Window"]);
    client('SlashCmdList.VXV("")');
    expect(client("return VXV_Window:IsShown()")).toBe(false);
  });

  it("lists the commands with /vxv aide, and for any unknown command", () => {
    const { client } = startCore();
    client('SlashCmdList.VXV("aide")');
    client('SlashCmdList.VXV("inconnue")');
    const help = [
      "|cff14b8a6VXV|r /vxv : ouvrir ou fermer la fenêtre",
      "|cff14b8a6VXV|r /vxv aide : afficher ces commandes",
      "|cff14b8a6VXV|r /vxv liste : exporter la liste de guilde pour le site (import réservé aux officiers)",
      "|cff14b8a6VXV|r /vxv ping : vérifier qui reçoit les messages de VXV",
    ];
    expect(client("return Printed")).toEqual([...help, ...help]);
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

  it("shows a place no module provides yet as coming soon, and a module's screen once it is loaded", () => {
    const { core, client } = startCore();
    client('SlashCmdList.VXV("")');
    client(`${TAB("Quêtes")}:Run("OnClick")`);
    expect((client(WINDOW) as { texts: string[] }).texts).toEqual([
      "MISSIONS",
      "Quêtes",
      "Bientôt : ce lieu ouvre avec sa phase.",
    ]);
    core.run(`VXV.RegisterModule({ id = "quests", tab = { place = "quests", Build = function(content)
        content:CreateFontString():SetText("Le tableau des quêtes")
    end } })`);
    client(`${TAB("Quêtes")}:Run("OnClick")`);
    expect((client(WINDOW) as { texts: string[] }).texts).toEqual(["Le tableau des quêtes"]);
  });

  it("opens a place's tab from its plaque in the tavern, the plaque turning plum when hovered", () => {
    const { core, client, errors } = startCore();
    const color = (token: string) => core.run(`local _, ns = ... return { ns.Theme.Color("${token}") }`);
    client('SlashCmdList.VXV("")');
    const spot = `FindWidget(VXV_Window, function(widget)
        return widget.plaque ~= nil and widget.plaque.children[#widget.plaque.children].text == "Raid"
    end)`;
    client(`${spot}:Run("OnEnter")`);
    expect(client(`return ${spot}.plaque.children[1].color`)).toEqual(color("plum"));
    client(`${spot}:Run("OnLeave")`);
    expect(client(`return ${spot}.plaque.children[1].color`)).toEqual(color("wood"));

    client(`${spot}:Run("OnClick")`);
    expect(client(`return ${TAB("Raid")}.label.color`)).toEqual(color("ivory"));
    expect(client(`return ${TAB("Taverne")}.label.color`)).toEqual(color("old-paper"));
    expect((client(WINDOW) as { texts: string[] }).texts).toEqual([
      "RAIDS & SR",
      "Raid",
      "Bientôt : ce lieu ouvre avec sa phase.",
    ]);
    expect(errors()).toEqual([]);
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

describe("theme", () => {
  it("writes capitals with the French accents", () => {
    const { core } = startCore();
    expect(core.run('local _, ns = ... return ns.Theme.Upper("Forge & métiers, Le Dé Pipé")')).toBe(
      "FORGE & MÉTIERS, LE DÉ PIPÉ",
    );
  });

  it("writes Latin and Cyrillic in our fonts, Chinese and Korean in the game's, as the owner chose", () => {
    const { core, client } = startCore();
    core.run('local _, ns = ... ns.Theme.Font("pixel", 16)');
    const members = client('return FontFamilies["VXVFont_pixel_16"]') as unknown as {
      alphabet: string;
      file: string;
    }[];
    expect(members.map(({ alphabet, file }) => [alphabet, file])).toEqual([
      ["roman", "Interface\\AddOns\\VXV_Core\\Media\\Fonts\\PixelifySans-SemiBold.ttf"],
      ["russian", "Interface\\AddOns\\VXV_Core\\Media\\Fonts\\PixelifySans-SemiBold.ttf"],
      ["korean", "Fonts\\korean.ttf"],
      ["simplifiedchinese", "Fonts\\simplifiedchinese.ttf"],
      ["traditionalchinese", "Fonts\\traditionalchinese.ttf"],
    ]);
  });

  it("writes a player's name in the game's class color, else the charter's", () => {
    const { core, client } = startCore();
    const colored = () => core.run('local _, ns = ... return ns.Theme.ClassColored("Ðéjà Vu", "ROGUE")');
    expect(colored()).toBe("|cfffff468Ðéjà Vu|r");
    client('RAID_CLASS_COLORS = { ROGUE = { colorStr = "ffabcdef" } }');
    expect(colored()).toBe("|cffabcdefÐéjà Vu|r");
  });
});
