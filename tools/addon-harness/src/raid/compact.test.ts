import { describe, expect, it } from "vitest";
import { ONYXIA_PACK, startRaid, websiteText } from "./fixtures.ts";
import { killAndOpen, LINKS, OFFICER, raidWithData } from "./raidGroup.ts";

const IN_ONYXIA = "Instance.id = 249";
const EPIC = (text: string) => `|cffc58bff${text}|r`;
/** The reduced mode's Raid tab, as the player sees it. */
const COMPACT = `
  local alert, kicker, cards, footer
  FindWidget(VXV_CompactWindow, function(widget)
      if widget.title ~= nil and widget.text ~= nil and widget.kind == "Frame" then alert = widget end
      if widget.progress ~= nil then footer = widget end
  end)
  cards = {}
  FindWidget(VXV_CompactWindow, function(widget)
      if widget.row ~= nil and widget.shown then
          cards[#cards + 1] = widget.row.detail and (widget.label.text .. " | " .. widget.detail.text) or widget.label.text
      end
      if widget.kind == "FontString" and widget.text and tostring(widget.text):find("^Prochain boss") then
          kicker = widget.text
      end
  end)
  return { alert = alert.shown and { alert.title.text, alert.text.text } or false, kicker = kicker, cards = cards,
      footer = { footer.progress.text, footer.origin.text } }
`;
const OPEN_COMPACT = 'SlashCmdList.VXV("") VXV_Window.reduce:Run("OnClick")';

describe("reduced mode: Raid", () => {
  it("shows in the raid's instance the next boss's loot with its soft reserves, and my SR on it", () => {
    const { client, importText, errors } = startRaid();
    importText(websiteText());
    client(ONYXIA_PACK);
    client(IN_ONYXIA);
    client(OPEN_COMPACT);
    expect(client(COMPACT)).toEqual({
      alert: ["Tu as une SR sur le prochain boss", "Onyxia · Sac en peau · SR+ 10"],
      kicker: "Prochain boss · Onyxia",
      cards: [
        `${EPIC("Tête d'Onyxia")} | SR : |cffffffffThom Leboss|r +20, |cffc69b6dCiel Gris|r`,
        `${EPIC("Sac en peau")} | SR : |cfffff468Ðéjà Vu|r (toi, +10)`,
        `${EPIC("Écaille d'Onyxia")} | Hors SR · loot council`,
        `${EPIC("Bâton du dragon")} | Aucune SR · roll libre`,
      ],
      footer: ["Raid : 0 / 2 · 0 / 2 boss", "Données du 10/12 19:45"],
    });
    expect(errors()).toEqual([]);
  });

  it("outside the raid's instance, says where the next boss shows and lists my SR", () => {
    const { client, importText } = startRaid();
    importText(websiteText());
    client(ONYXIA_PACK);
    client(OPEN_COMPACT);
    expect(client(COMPACT)).toMatchObject({
      alert: false,
      kicker: "Prochain boss",
      cards: [
        "Le prochain boss et son butin s'affichent dans l'instance du raid.",
        "Mes SR",
        `${EPIC("Sac en peau")} |cfff2c94cSR+ 10|r`,
        "|cffa49bbdSR+ : +10 par raid sans l'objet si tu le re-SR (max +30).|r",
      ],
      footer: ["Raid : 0 / 2", "Données du 10/12 19:45"],
    });
  });

  it("moves on to the next boss once one falls, and reads the instance again when the tab shows", () => {
    const guild = raidWithData([OFFICER, "Thom Leboss", "Aube Claire"]);
    const officer = guild.player(OFFICER);
    officer.client(ONYXIA_PACK);
    officer.client(OPEN_COMPACT);
    officer.client(IN_ONYXIA);
    officer.client('VXV_CompactWindow.children[#VXV_CompactWindow.children]:Run("OnShow")');
    killAndOpen(guild, [LINKS.cape]);
    expect(officer.client(COMPACT)).toMatchObject({
      alert: false,
      kicker: "Prochain boss · Gardienne",
      cards: [`${EPIC("Cape de la gardienne")} | Aucune SR · roll libre`],
      footer: ["Raid : 3 / 2 · 1 / 2 boss", "Données du 10/12 19:45"],
    });
    expect(officer.errors()).toEqual([]);
  });
});
