import { describe, expect, it } from "vitest";
import type { LoadedAddon } from "../addon.ts";
import { ONYXIA_NIGHT, startRaid, websiteText } from "./fixtures.ts";

const PREFIX = "|cff14b8a6VXV|r ";
const ROWS = `
  local _, ns = ...
  local _, sender = ns.RaidData.Text()
  return ns.RaidView.Rows({ event = ns.RaidData.Current(), player = VXV.PlayerName(), sender = sender })
`;
const ICON = "|TInterface\\LFGFrame\\UI-LFG-ICON-PORTRAITROLES:14:14:0:0:64:64:";
const NOT_OFFICER =
  "Seuls les officiers chargent les données, et ce personnage n'est pas lié à un officier sur le site.";

interface Row {
  kind: string;
  text: string;
  tooltip?: { title: string; lines: string[] };
}

/** The rows the Raid tab shows to this player. */
const rowsOf = (raid: LoadedAddon) => raid.run(ROWS) as unknown as Row[];

/** Opens /vxv on the Raid tab. */
const OPEN_RAID_TAB = `
  SlashCmdList.VXV("")
  FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "Raid" end):Run("OnClick")
`;
/** The shown row of the Raid tab whose text contains this. */
const ROW_FRAME = (text: string) =>
  `FindWidget(VXV_Window, function(widget)
      return widget.row ~= nil and widget.shown and tostring(widget.label.text):find(${JSON.stringify(text)}, 1, true)
  end)`;
const LOAD_BUTTON = 'FindWidget(VXV_Window, function(widget) return widget.text == "Charger les données" end)';
const savedEvent = (text: string) => `{ schemaVersion = 2, modules = { raid = { text = ${JSON.stringify(text)} } } }`;

describe("Raid tab", () => {
  it("explains how the data arrive before an officer loads them", () => {
    const { raid, errors } = startRaid();
    expect(rowsOf(raid).map((row) => row.text)).toEqual([
      "Aucun raid chargé pour l'instant.",
      "Un officier charge les données depuis la page de l'événement sur le site (/vxv importer).",
    ]);
    expect(errors()).toEqual([]);
  });

  it("shows the event an officer pasted from the website: sign-ups, soft reserves, exclusions, journal", () => {
    const { raid, client, importText, errors } = startRaid();
    importText(websiteText());
    expect(client("return Printed")).toContain(`${PREFIX}Données chargées : Onyxia, le 10/12 20:00.`);
    expect(client("return VXV_TextWindow:IsShown()")).toBe(false);
    expect(rowsOf(raid).map(({ kind, text }) => [kind, text])).toEqual([
      ["title", "Onyxia · 10/12 20:00"],
      ["line", "2 SR par joueur · données de Ðéjà Vu, copiées le 10/12 19:45"],
      ["header", "Inscrits (2 attendus sur 3)"],
      ["line", "Tanks 0 · Soigneurs 1 · DPS 1"],
      ["line", `${ICON}20:39:22:41|t |cfffff468Ðéjà Vu|r · Combat`],
      ["line", `${ICON}20:39:1:20|t |cffffffffThom Leboss|r · Sacré (En retard)`],
      ["line", `${ICON}0:19:22:41|t |cffc69b6dCiel Gris|r · Protection (Banc)`],
      ["header", "Mes SR"],
      ["line", "Sac en peau (Onyxia) +10"],
      ["header", "SR du raid"],
      ["line", "Tête d'Onyxia : |cffffffffThom Leboss|r +20, |cffc69b6dCiel Gris|r"],
      ["line", "Sac en peau : |cfffff468Ðéjà Vu|r +10"],
      ["header", "Objets exclus des SR"],
      ["line", "Écaille d'Onyxia (Onyxia)"],
      ["header", "Modifications (1)"],
      ["line", "09/12 18:00 · Officier · Objet exclu des SR : « Écaille d'Onyxia » (Onyxia, 10/12/2026 21:00)"],
    ]);
    expect(errors()).toEqual([]);
  });

  it("gives the class on hovering a player, and the reason on hovering a change", () => {
    const { client, importText, errors } = startRaid();
    importText(websiteText());
    client(OPEN_RAID_TAB);
    client(`${ROW_FRAME("Ciel Gris|r · Protection")}:Run("OnEnter")`);
    expect(client("return { GameTooltip.text, GameTooltip.lines }")).toEqual([
      "Ciel Gris",
      ["Guerrier · Protection", "Tank · Banc", "Reroll : invité à la main par un officier."],
    ]);
    client(`${ROW_FRAME("Objet exclu des SR")}:Run("OnEnter")`);
    expect(client("return GameTooltip.lines")).toContain("Motif : Pour le tank principal");
    expect(errors()).toEqual([]);
  });

  it("keeps the event in the saved data, shown again after /reload", () => {
    const text = websiteText();
    const first = startRaid();
    first.importText(text);
    expect(first.client("return VXV_DB.modules.raid.text")).toBe(text);

    const reloaded = startRaid({ savedVariables: savedEvent(text) });
    expect(rowsOf(reloaded.raid)[0]?.text).toBe("Onyxia · 10/12 20:00");
    expect(reloaded.errors()).toEqual([]);
  });

  it("lets only the officers the website names load the data", () => {
    const { client, importText, errors } = startRaid({ playerName: "Thom Leboss" });
    importText(websiteText());
    expect(client("return Printed")).toContain(PREFIX + NOT_OFFICER);
    expect(client("return VXV_TextWindow:IsShown()")).toBe(true);
    expect(client("return VXV_DB.modules.raid.text")).toBeUndefined();
    expect(errors()).toEqual([]);
  });

  it.each([
    ["an officer", "Ðéjà Vu", true],
    ["another member", "Thom Leboss", false],
  ])("shows the load button to %s once data are loaded", (_, playerName, shown) => {
    const { client } = startRaid({ playerName, savedVariables: savedEvent(websiteText()) });
    client(OPEN_RAID_TAB);
    expect(client(`return ${LOAD_BUTTON}.shown`)).toBe(shown);
  });

  it.each([
    ["a text from elsewhere", "Bonjour", "Ce texte n'est pas une donnée d'événement"],
    ["a damaged line", websiteText().replace("I;20;", "I;vingt;"), "Ligne 4 illisible"],
  ])("refuses %s and keeps the window open to paste again", (_, text, refusal) => {
    const { client, importText, errors } = startRaid();
    importText(text);
    expect(client("return Printed")).toContainEqual(expect.stringContaining(refusal));
    expect(client("return VXV_TextWindow:IsShown()")).toBe(true);
    expect(client("return VXV_DB.modules.raid.text")).toBeUndefined();
    expect(errors()).toEqual([]);
  });

  it("does not replace newer data by the same or older data", () => {
    const { client, importText } = startRaid();
    importText(websiteText());
    importText(websiteText());
    expect(client("return Printed")).toContain(`${PREFIX}Ces données sont déjà chargées.`);
    importText(websiteText({ ...ONYXIA_NIGHT, exportedAt: new Date("2026-12-10T19:00:00Z") }));
    expect(client("return Printed")).toContain(
      `${PREFIX}Tu as déjà des données plus récentes (copiées le 10/12 19:45).`,
    );
  });
});
