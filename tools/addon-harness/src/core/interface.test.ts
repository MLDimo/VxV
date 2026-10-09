import { describe, expect, it } from "vitest";
import { startCore } from "../core.ts";
import { drawnAbove } from "../strata.ts";

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
const TABS = ["Taverne", "Raid", "PvP", "Le Dé Pipé", "Quêtes", "Ranking", "Artisans", "Journal"];
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
        "VXV @project-version@ · Connectés avec VXV (1)",
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

  describe("tavern", () => {
    const SPOT = (name: string) => `FindWidget(VXV_Window, function(widget)
        return widget.plaque ~= nil and widget.plaque.children[#widget.plaque.children].text == "${name}"
    end)`;
    const SCENE = "FindWidget(VXV_Window, function(widget) return widget.scripts and widget.scripts.OnUpdate end)";
    const CARDS = `
      local cards = {}
      FindWidget(VXV_Window, function(widget)
          if widget.card ~= nil then
              cards[#cards + 1] = { widget.kicker.text, widget.title.text, widget.text.text, widget.action.shown }
          end
      end)
      return cards
    `;

    it("opens a place's tab from its plaque, the plaque rising and turning plum when hovered", () => {
      const { core, client, errors } = startCore();
      const color = (token: string) => core.run(`local _, ns = ... return { ns.Theme.Color("${token}") }`);
      client('SlashCmdList.VXV("")');
      const plaqueY = () => client(`return select(5, ${SPOT("Raid")}.plaque:GetPoint())`) as number;
      const resting = plaqueY();
      client(`${SPOT("Raid")}:Run("OnEnter")`);
      expect(client(`return ${SPOT("Raid")}.plaque.children[1].color`)).toEqual(color("plum"));
      expect(plaqueY()).toBe(resting + 4);
      client(`${SPOT("Raid")}:Run("OnLeave")`);
      expect(client(`return ${SPOT("Raid")}.plaque.children[1].color`)).toEqual(color("wood"));
      expect(plaqueY()).toBe(resting);

      client(`${SPOT("Raid")}:Run("OnClick")`);
      expect(client(`return ${TAB("Raid")}.label.color`)).toEqual(color("ivory"));
      expect(client(`return ${TAB("Taverne")}.label.color`)).toEqual(color("old-paper"));
      expect((client(WINDOW) as { texts: string[] }).texts).toEqual([
        "RAIDS & SR",
        "Raid",
        "Bientôt : ce lieu ouvre avec sa phase.",
      ]);
      expect(errors()).toEqual([]);
    });

    it("lights the hearth, the door and the forge, flickering in steps or breathing", () => {
      const { client } = startCore();
      client('SlashCmdList.VXV("")');
      const lights = client(`
        local lights = {}
        for _, child in ipairs(${SCENE}.children) do
            if child.blendMode == "ADD" then
                local steps = {}
                for _, step in ipairs(child.animation.steps) do steps[#steps + 1] = { step.from, step.to } end
                lights[#lights + 1] = { playing = child.animation.playing, looping = child.animation.looping, steps = steps }
            end
        end
        return lights
      `);
      const flick = {
        playing: true,
        looping: "REPEAT",
        steps: [
          [0.55, 0.55],
          [0.8, 0.8],
          [0.6, 0.6],
          [0.9, 0.9],
        ],
      };
      const pulse = {
        playing: true,
        looping: "REPEAT",
        steps: [
          [0.45, 0.8],
          [0.8, 0.45],
        ],
      };
      expect(lights).toEqual([flick, pulse, flick]);
    });

    it("moves the picture a little with the cursor, and back when the cursor leaves the scene", () => {
      const { client } = startCore();
      client('SlashCmdList.VXV("")');
      // The picture is 3 % larger than the scene: at rest, the middle of it shows.
      const margin = (1 - 1 / 1.03) / 2;
      const coords = (cursorX: number) =>
        client(`
          local scene = ${SCENE}
          scene.centerX, scene.centerY = 500, 400
          Cursor.x, Cursor.y = ${String(cursorX)}, 400
          scene:Run("OnUpdate", 1)
          return scene.children[1].coords
        `) as number[];
      // Cursor on the right edge: the picture moves 6 pixels left, showing more of its right side.
      const right = coords(500 + 976 / 2);
      expect(right[0]).toBeCloseTo(margin + 6 / (976 * 1.03), 6);
      expect(right[2]).toBeCloseTo(margin, 6);
      const outside = coords(5000);
      expect(outside[0]).toBeCloseTo(margin, 6);
    });

    it("shows under the scene the cards of the places to come", () => {
      const { client } = startCore();
      client('SlashCmdList.VXV("")');
      expect(client(CARDS)).toEqual([
        ["Prochain raid", "Bientôt", "Ce lieu ouvre avec sa phase.", false],
        ["Quête de la semaine", "Bientôt", "Le tableau des quêtes ouvre avec les missions de la guilde.", false],
        ["Le Dé Pipé", "Bientôt", "Paris et deathroll arrivent avec la salle de jeu.", false],
      ]);
    });

    it("names who is connected with VXV on hovering the footer", () => {
      const { client } = startCore();
      client('SlashCmdList.VXV("")');
      client(`FindWidget(VXV_Window, function(widget)
          return widget.label ~= nil and tostring(widget.label.text):find("Connectés", 1, true)
      end):Run("OnEnter")`);
      expect(client("return { GameTooltip.text, GameTooltip.lines }")).toEqual(["Connectés avec VXV", ["Ðéjà Vu"]]);
    });
  });

  it("dresses the tavern up for the WoW holiday of the day, on the Taverne tab and behind each screen", () => {
    const { client } = startCore();
    // 20 December 2026 at noon: the Voile d'hiver (packages/design/src/seasons.ts).
    client("Clock.epoch = 1797768000 - Clock.now");
    client('SlashCmdList.VXV("")');
    const winterVeil = "Interface\\AddOns\\VXV_Core\\Media\\Tavernes\\voile-d-hiver.png";
    const pictures = () =>
      client(`local paths = {}
        FindWidget(VXV_Window, function(widget)
            paths[#paths + 1] = widget.path
            return false
        end)
        return paths`) as string[];
    expect(pictures()).toContain(winterVeil);
    client(`${TAB("Quêtes")}:Run("OnClick")`);
    expect(pictures().filter((path) => path === winterVeil)).toHaveLength(2);
  });

  it("frames the tavern on the place behind each screen, very dark under a veil", () => {
    const { client } = startCore();
    client('SlashCmdList.VXV("")');
    client(`${TAB("Quêtes")}:Run("OnClick")`);
    const [picture, veil] = client(`
      local content
      for _, child in ipairs(VXV_Window.children) do
          if child ~= VXV_Window.header and child.kind == "Frame" and child:IsShown() then content = child end
      end
      local picture, veil = content.children[1], content.children[2]
      return { { path = picture.path, alpha = picture.alpha, coords = picture.coords }, { path = veil.path } }
    `) as { path: string; alpha: number; coords: number[] }[];
    expect(picture?.path).toBe("Interface\\AddOns\\VXV_Core\\Media\\taverne.png");
    expect(picture?.alpha).toBe(0.3);
    // Quêtes: background-position 22 % 45 %, the picture 2.5 times as wide as the 976 x 600 screen.
    const width = 976 * 2.5;
    const height = (width * 672) / 1589;
    const left = ((width - 976) * 0.22) / width;
    const top = ((height - 600) * 0.45) / height;
    const expected = [left, left + 976 / width, top, top + 600 / height];
    picture?.coords.forEach((coord, index) => {
      expect(coord).toBeCloseTo(expected[index] ?? 0, 6);
    });
    expect(veil?.path).toBe("Interface\\AddOns\\VXV_Core\\Media\\veil.png");
  });

  describe("reduced mode", () => {
    const COMPACT_TABS = `
      local tabs = {}
      FindWidget(VXV_CompactWindow, function(widget)
          if widget.SetSelected ~= nil then tabs[#tabs + 1] = widget.label:GetText() end
      end)
      return tabs
    `;
    const COMPACT_TEXTS = `
      local texts = {}
      for _, child in ipairs(VXV_CompactWindow.children) do
          if child ~= VXV_CompactWindow.header and child.kind == "Frame" and child:IsShown() then
              FindWidget(child, function(widget)
                  if widget.kind == "FontString" and widget.text ~= nil then texts[#texts + 1] = widget.text end
              end)
          end
      end
      return texts
    `;

    it("switches to the reduced mode and back, on the same place, and reopens the mode used last", () => {
      const { client, errors } = startCore();
      client('SlashCmdList.VXV("")');
      client(`${TAB("Quêtes")}:Run("OnClick")`);
      client('VXV_Window.reduce:Run("OnClick")');
      expect(client("return { VXV_Window:IsShown(), VXV_CompactWindow:IsShown() }")).toEqual([false, true]);
      expect(client(COMPACT_TABS)).toEqual(["Raid", "Paris", "Quêtes", "Ranking", "…"]);
      expect(client(COMPACT_TEXTS)).toEqual(["Bientôt : ce lieu ouvre avec sa phase."]);
      expect(client("return VXV_DB.ui.window.reduced")).toBe(true);

      client('SlashCmdList.VXV("")');
      expect(client("return VXV_CompactWindow:IsShown()")).toBe(false);
      client('SlashCmdList.VXV("")');
      expect(client("return { VXV_Window:IsShown(), VXV_CompactWindow:IsShown() }")).toEqual([false, true]);

      client('VXV_CompactWindow.expand:Run("OnClick")');
      expect(client("return { VXV_Window:IsShown(), VXV_CompactWindow:IsShown() }")).toEqual([true, false]);
      expect((client(WINDOW) as { texts: string[] }).texts).toContain("Quêtes");
      expect(client("return VXV_DB.ui.window.reduced")).toBe(false);
      expect(client("return UISpecialFrames")).toEqual(["VXV_Window", "VXV_CompactWindow"]);
      expect(errors()).toEqual([]);
    });

    it("opens the reduced mode on its first tab from a place without a compact screen, and the others with …", () => {
      const { client } = startCore();
      client('SlashCmdList.VXV("")');
      client('VXV_Window.reduce:Run("OnClick")');
      const selected = `return FindWidget(VXV_CompactWindow, function(widget)
          return widget.SetSelected ~= nil and widget.label.text == "Raid"
      end).label.color`;
      expect(client(selected)).toEqual(client('local _, ns = ... return { VXV.Theme.Color("ivory") }'));
      client('VXV_CompactWindow.more:Run("OnClick")');
      expect(client("return { VXV_Window:IsShown(), VXV_CompactWindow:IsShown() }")).toEqual([true, false]);
      expect((client(WINDOW) as { texts: string[] }).texts).toContain(
        "Survole un lieu pour l'éclairer · clique pour entrer",
      );
    });
  });

  it("draws its dialogs over its windows, above the panels of their screens", () => {
    const { client } = startCore();
    client('SlashCmdList.VXV("") VXV.CreateDialog("VXV_TestDialog", 200, 100, "Test"):Show()');
    client('VXV_Window.reduce:Run("OnClick")');
    const strata = client("return { VXV_TestDialog.strata, VXV_Window.strata, VXV_CompactWindow.strata }") as unknown[];
    expect(drawnAbove(strata[0], strata[1])).toBe(true);
    expect(drawnAbove(strata[0], strata[2])).toBe(true);
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
