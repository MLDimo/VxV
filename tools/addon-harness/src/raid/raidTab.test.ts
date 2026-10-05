import { describe, expect, it } from "vitest";
import type { LoadedAddon } from "../addon.ts";
import { ONYXIA_NIGHT, startRaid, websiteText } from "./fixtures.ts";

const PREFIX = "|cff14b8a6VXV|r ";
/** What the Raid screen shows to this player, section by section. */
const VIEW = `
  local _, ns = ...
  local event, player = ns.RaidData.Current(), VXV.PlayerName()
  local _, sender = ns.RaidData.Text()
  return {
    header = ns.RaidView.Header(event, sender, time()),
    me = ns.RaidView.Me(event, player),
    composition = ns.RaidView.Composition(event),
    myReserves = ns.RaidView.MyReserves(event, player),
    raidReserves = ns.RaidView.RaidReserves(event),
  }
`;
const ICON = "|TInterface\\LFGFrame\\UI-LFG-ICON-PORTRAITROLES:14:14:0:0:64:64:";
const NOT_OFFICER =
  "Seuls les officiers chargent les données, et ce personnage n'est pas lié à un officier sur le site.";
// The charter's colors (§2): epic items, SR+ in gold, muted notes; class colors, a late player's dimmed.
const EPIC = (text: string) => `|cffc58bff${text}|r`;
const BONUS = (bonus: number) => ` |cfff2c94cSR+ ${String(bonus)}|r`;
const MUTED = (text: string) => `|cffa49bbd${text}|r`;
const DEJA = "|cfffff468Ðéjà Vu|r";
const THOM = "|cffffffffThom Leboss|r";
const THOM_LATE = "|cff939196Thom Leboss|r";
const CIEL = "|cffc69b6dCiel Gris|r";

interface Row {
  kind: string;
  text?: string;
  share?: number;
  color?: string;
  tooltip?: { title: string; lines: string[] };
}
interface View {
  header: { kicker: string; title: string; subtitle: string; badges: { text: string; color: string }[] };
  me: Row[];
  composition: Row[];
  myReserves: Row[];
  raidReserves: Row[];
}

const viewOf = (raid: LoadedAddon) => raid.run(VIEW) as unknown as View;
const texts = (rows: Row[]) => rows.map((row) => row.text ?? `bar ${String(row.color)} ${String(row.share)}`);

/** Opens /vxv on the Raid tab. */
const OPEN_RAID_TAB = `
  SlashCmdList.VXV("")
  FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "Raid" end):Run("OnClick")
`;
/** The shown row of the window whose text contains this. */
const ROW_FRAME = (text: string) =>
  `FindWidget(VXV_Window, function(widget)
      return widget.row ~= nil and widget.shown and tostring(widget.label.text):find(${JSON.stringify(text)}, 1, true)
  end)`;
const SHOWN_TEXTS = `
  local texts = {}
  FindWidget(VXV_Window, function(widget)
      if widget.text ~= nil and IsVisible(widget) then texts[#texts + 1] = widget.text end
  end)
  return texts
`;
const LOAD_BUTTON = 'FindButton(VXV_Window, "Charger les données")';
const savedEvent = (text: string) => `{ schemaVersion = 2, modules = { raid = { text = ${JSON.stringify(text)} } } }`;

describe("Raid screen", () => {
  it("explains how the data arrive before an officer loads them", () => {
    const { raid, errors } = startRaid();
    const view = viewOf(raid);
    expect(view.header).toEqual({
      kicker: "Conseil de guerre",
      title: "Aucun raid chargé",
      subtitle: "Un officier les envoie à la guilde, ou ton compagnon VXV les apporte au prochain /reload.",
      badges: {},
    });
    expect(texts(view.me)).toEqual([
      "Tu n'es pas inscrit avec ce personnage.",
      "Inscris-toi sur le site ou avec le bouton du message Discord.",
    ]);
    expect(view.composition).toEqual({});
    expect(errors()).toEqual([]);
  });

  it("heads the event an officer pasted: date, soft reserves, origin, expected players and lock", () => {
    const { raid, client, importText, errors } = startRaid();
    importText(websiteText());
    expect(client("return Printed")).toContain(`${PREFIX}Données chargées : Onyxia, le 10/12 20:00.`);
    expect(client("return VXV_TextWindow:IsShown()")).toBe(false);
    // The test clock starts on the raid's day at noon: the soft reserves lock half an hour before 20:00.
    expect(viewOf(raid).header).toEqual({
      kicker: "Conseil de guerre · prochain raid",
      title: "Onyxia",
      subtitle: "10/12 20:00 · 2 SR par joueur · données de Ðéjà Vu, copiées le 10/12 19:45",
      badges: [
        { text: "2 attendus", color: "gain" },
        { text: "SR verrouillées dans 7 h 30", color: "gold" },
      ],
    });
    client("Clock.now = Clock.now + 8 * 3600");
    expect(viewOf(raid).header.badges[1]).toEqual({ text: "SR verrouillées", color: "gold" });
    expect(errors()).toEqual([]);
  });

  it("shows my sign-up and my soft reserves with their SR+", () => {
    const { raid, importText } = startRaid();
    importText(websiteText());
    const view = viewOf(raid);
    expect(texts(view.me)).toEqual([DEJA, "Voleur · DPS · main", "Spécialisation : Combat", "Statut : Présent"]);
    expect(texts(view.myReserves)).toEqual([
      EPIC("Sac en peau") + BONUS(10),
      MUTED("SR+ : +10 par raid sans l'objet si tu le re-SR (max +50)."),
    ]);
    expect(view.myReserves[0]?.tooltip).toEqual({ title: "Sac en peau", lines: ["Boss : Onyxia"] });
  });

  it("composes the raid by role, the late players dimmed, then the others", () => {
    const { raid, importText } = startRaid();
    importText(websiteText());
    expect(texts(viewOf(raid).composition)).toEqual([
      "1 présent · 1 en retard · 1 au banc",
      `${ICON}0:19:22:41|t Tanks · 0`,
      "bar gain 0",
      `${ICON}20:39:1:20|t Soigneurs · 1`,
      "bar gold 0.5",
      `${THOM_LATE} · Sacré (En retard)`,
      `${ICON}20:39:22:41|t DPS · 1`,
      "bar amethyst 0.5",
      `${DEJA} · Combat`,
      "Peut-être, banc, absents",
      `${CIEL} · Banc`,
    ]);
  });

  it("lists the raid's soft reserves with their SR+, and the items excluded", () => {
    const { raid, importText } = startRaid();
    importText(websiteText());
    const reserves = viewOf(raid).raidReserves;
    expect(texts(reserves)).toEqual([
      `${EPIC("Tête d'Onyxia")} : ${THOM}${BONUS(20)}, ${CIEL}`,
      `${EPIC("Sac en peau")} : ${DEJA}${BONUS(10)}`,
      `${EPIC("Écaille d'Onyxia")} · exclu des SR (loot council)`,
    ]);
    expect(reserves[0]?.tooltip?.lines).toEqual(["Boss : Onyxia", "Thom Leboss (SR+ +20)", "Ciel Gris"]);
  });

  it("lays the screen out in panels, and gives the class on hovering a player", () => {
    const { client, importText, errors } = startRaid();
    importText(websiteText());
    client(OPEN_RAID_TAB);
    const shown = client(SHOWN_TEXTS) as unknown as string[];
    for (const text of ["Onyxia", "Mon inscription", "Officier", "Composition", "SR du raid", "Mes SR"]) {
      expect(shown).toContain(text);
    }
    expect(shown).toContain("Derniers loots");
    expect(shown).toContain("2 attendus");
    expect(shown).toContain("CONSEIL DE GUERRE · PROCHAIN RAID");
    client(`${ROW_FRAME("Ciel Gris|r · Banc")}:Run("OnEnter")`);
    expect(client("return { GameTooltip.text, GameTooltip.lines }")).toEqual([
      "Ciel Gris",
      ["Guerrier · Protection", "Tank · Banc", "Reroll : invité à la main par un officier."],
    ]);
    expect(errors()).toEqual([]);
  });

  it("puts the officers' changes and their reason in the Journal", () => {
    const { client, importText, errors } = startRaid();
    importText(websiteText());
    client(OPEN_RAID_TAB);
    client(
      'FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "Journal" end):Run("OnClick")',
    );
    const shown = client(SHOWN_TEXTS) as unknown as string[];
    expect(shown).toEqual(
      expect.arrayContaining([
        "La caisse",
        "Modifications des officiers",
        "RAID",
        "09/12 18:00 · Officier",
        "Objet exclu des SR : « Écaille d'Onyxia » (Onyxia, 10/12/2026 21:00)",
        "Motif : Pour le tank principal",
      ]),
    );
    expect(errors()).toEqual([]);
  });

  it("gives the Taverne the next raid's card, updated when the data arrive", () => {
    const { client, importText, errors } = startRaid();
    const RAID_CARD = `
      local card = FindWidget(VXV_Window, function(widget) return widget.card ~= nil and widget.card.place == "raid" end)
      return { card.title.text, card.text.text, card.action.label.text }
    `;
    client('SlashCmdList.VXV("")');
    expect(client(RAID_CARD)).toEqual([
      "Aucun raid chargé",
      "Un officier les envoie à la guilde, ou ton compagnon VXV les apporte.",
      "Voir le raid",
    ]);
    importText(websiteText());
    expect(client(RAID_CARD)).toEqual([
      "10/12 20:00",
      "Onyxia · 2 attendus\n|cff7ee2a00 tanks|r  |cfff2c94c1 heals|r  |cffa35cff1 DPS|r",
      "Voir le raid",
    ]);
    client(
      'FindWidget(VXV_Window, function(widget) return widget.card ~= nil and widget.card.place == "raid" end).action:Run("OnClick")',
    );
    expect(
      client(
        'return FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "Raid" end).label.color',
      ),
    ).toEqual(client('local _, ns = ... return { VXV.Theme.Color("ivory") }'));
    expect(errors()).toEqual([]);
  });

  it("keeps the event in the saved data, shown again after /reload", () => {
    const text = websiteText();
    const first = startRaid();
    first.importText(text);
    expect(first.client("return VXV_DB.modules.raid.text")).toBe(text);

    const reloaded = startRaid({ savedVariables: savedEvent(text) });
    expect(viewOf(reloaded.raid).header.title).toBe("Onyxia");
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
  ])("shows the officers' panel to %s once data are loaded", (_, playerName, shown) => {
    const { client } = startRaid({ playerName, savedVariables: savedEvent(websiteText()) });
    client(OPEN_RAID_TAB);
    expect(client(`return IsVisible(${LOAD_BUTTON})`)).toBe(shown);
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
