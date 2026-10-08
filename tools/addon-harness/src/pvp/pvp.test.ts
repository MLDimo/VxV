import { formatAddonEventRoles } from "@vxv/server/domain/addonEventRoles";
import { formatAddonPvp, type AddonPvpFacts } from "@vxv/server/domain/addonPvp";
import type { Duel } from "@vxv/server/domain/duels";
import { describe, expect, it } from "vitest";
import { loadedBundle, startCore } from "../core.ts";
import { EXPORTED, GUILD_READERS } from "../siteFixtures.ts";
import { companionFiles } from "../sync/fixtures.ts";

const BUNDLES = ["VXV_PvP", "VXV_Sync"];
const PREFIX = "|cff14b8a6VXV|r ";
const SATURDAY = new Date("2026-12-12T20:00:00Z");
const duel = (id: string, challengerId: string, opponentId: string, overrides: Partial<Duel> = {}): Duel => ({
  id,
  challengerId,
  opponentId,
  scheduledAt: SATURDAY,
  place: "Porte d'Orgrimmar",
  createdAt: EXPORTED,
  accepted: undefined,
  betId: undefined,
  winnerId: undefined,
  playedAt: undefined,
  cancelledAt: undefined,
  discordMessage: undefined,
  ...overrides,
});
/** Thom Leboss (the player) has a duel to play against Ciel Gris, and one to answer; Ðéjà Vu beat Ciel Gris. */
const PVP: AddonPvpFacts = {
  ...GUILD_READERS,
  exportedAt: EXPORTED,
  outings: [
    {
      event: {
        id: "e1",
        kind: "pvp",
        title: "Raid sur Astranaar",
        startsAt: SATURDAY,
        softReservesPerPlayer: 0,
        raids: [],
        role: undefined,
        discordMessageId: undefined,
      },
      signups: [
        {
          eventId: "e1",
          memberId: "m-ciel",
          characterId: "c-Ciel",
          characterName: "Ciel Gris",
          characterClass: "PRIEST",
          role: "healer",
          spec: "Sacré",
          status: "present",
        },
      ],
    },
  ],
  players: [
    { memberId: "m-deja", name: "Ðéjà Vu", characterClass: "ROGUE" },
    { memberId: "m-thom", name: "Thom Leboss", characterClass: "ROGUE" },
    { memberId: "m-ciel", name: "Ciel Gris", characterClass: "PRIEST" },
  ],
  duels: [
    { duel: duel("d1", "m-thom", "m-ciel", { accepted: true, betId: "b1" }), status: "scheduled" },
    { duel: duel("d2", "m-ciel", "m-thom"), status: "proposed" },
    { duel: duel("d3", "m-deja", "m-ciel", { accepted: true, winnerId: "m-deja" }), status: "played" },
  ],
  ranking: [
    { rank: 1, memberId: "m-deja", rating: 1510, won: 1, played: 1 },
    { rank: 2, memberId: "m-ciel", rating: 1490, won: 0, played: 1 },
  ],
  changes: [],
};
const ROLES = formatAddonEventRoles(
  [
    { id: "guild", name: "Tout le monde", everyone: true },
    { id: "r1", name: "Raideur R1", everyone: false },
  ],
  { ...GUILD_READERS, exportedAt: EXPORTED },
);

const OPEN_PVP = `
  SlashCmdList.VXV("")
  FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "PvP" end):Run("OnClick")
`;
const ROWS = `
  local texts = {}
  FindWidget(VXV_Window, function(widget)
      if widget.row ~= nil and widget.shown then texts[#texts + 1] = widget.label.text end
  end)
  return texts
`;
const SHOWN = (frame: string) => `
  local texts = {}
  FindWidget(${frame}, function(w) if w.kind == "FontString" and w.text ~= nil and IsVisible(w) then texts[#texts + 1] = w.text end end)
  return texts
`;
const PENDING = `
  local list = {}
  for _, change in pairs(VXV_DB.modules.pvp.pending) do list[#list + 1] = change end
  return list
`;
/** Clicks the row showing this text, its colors aside. */
const clickRow = (text: string) => `
  FindWidget(VXV_Window, function(w)
    return w.row ~= nil and w.shown and w.label.text:gsub("|c%x%x%x%x%x%x%x%x(.-)|r", "%1"):find(${JSON.stringify(text)}, 1, true)
  end):Run("OnMouseUp")
`;
const click = (frame: string, label: string) =>
  `FindWidget(${frame}, function(w) return w.label and w.label.text == ${JSON.stringify(label)} and IsVisible(w) end):Run("OnClick")`;
const typeIn = (frame: string, index: number, text: string) => `
  local boxes = {}
  FindWidget(${frame}, function(w) if w.kind == "EditBox" then boxes[#boxes + 1] = w end end)
  boxes[${String(index)}]:SetText(${JSON.stringify(text)})
`;
/** Without their colors. */
const plain = (texts: unknown) => (texts as string[]).map((text) => text.replace(/\|c\w{8}(.*?)\|r/gu, "$1"));

function startPvp(playerName = "Thom Leboss", inbox: Record<string, string> = { pvp: formatAddonPvp(PVP) }) {
  const started = startCore({ playerName, written: companionFiles(inbox), bundles: BUNDLES });
  started.client(OPEN_PVP);
  return started;
}

describe("the PvP place in game", () => {
  it("shows the outings to come, the duels with how they stand, the Elo ranking and the player's Elo", () => {
    const { client, errors } = startPvp();
    const rows = plain(client(ROWS));
    for (const text of [
      "Raid sur Astranaar",
      "Thom Leboss contre Ciel Gris",
      "Ciel Gris contre Thom Leboss",
      "Ðéjà Vu contre Ciel Gris",
      "Pari ouvert : Le Dé Pipé › Paris, ou le site",
      "1. Ðéjà Vu · 1510 · 1 victoire sur 1 duel",
    ]) {
      expect(rows).toContain(text);
    }
    expect(rows).toContainEqual(expect.stringContaining("1 attendu · Pas inscrit"));
    expect(rows).toContainEqual(expect.stringContaining("Ðéjà Vu gagne"));
    expect(plain(client(SHOWN("VXV_Window")))).toContain("Mon Elo : 1500");
    expect(errors()).toEqual([]);
  });

  it("signs up to an outing with the core's dialog", () => {
    const { client, errors } = startPvp();
    client(clickRow("Raid sur Astranaar"));
    client(click("VXV_SignupDialog", "Tank"));
    client(typeIn("VXV_SignupDialog", 1, "Protection"));
    client(click("VXV_SignupDialog", "Présent"));
    client(click("VXV_SignupDialog", "Envoyer"));
    expect(client(PENDING)).toEqual([
      expect.objectContaining({ kind: "signup", eventId: "e1", role: "tank", spec: "Protection", status: "present" }),
    ]);
    expect(plain(client(ROWS))).toContainEqual(expect.stringContaining("En attente du site : Présent"));
    expect(errors()).toEqual([]);
  });

  it("takes up a challenge, and offers a duelist to concede or call off a duel", () => {
    const { client, errors } = startPvp();
    client(clickRow("Ciel Gris contre Thom Leboss"));
    expect(plain(client(SHOWN("VXV_DuelActions")))).toEqual(
      expect.arrayContaining(["Relever le défi", "Refuser", "Annuler le duel"]),
    );
    client(click("VXV_DuelActions", "Relever le défi"));
    expect(client(PENDING)).toEqual([expect.objectContaining({ kind: "duelAnswer", duelId: "d2", accept: true })]);
    client(clickRow("Thom Leboss contre Ciel Gris"));
    const shown = plain(client(SHOWN("VXV_DuelActions")));
    expect(shown).toContain("J'ai perdu");
    expect(shown).not.toContain("Relever le défi");
    expect(errors()).toEqual([]);
  });

  it("challenges a member typed by name, whatever its case", () => {
    const { client, errors } = startPvp();
    client(click("VXV_Window", "Défier"));
    client(click("VXV_DuelDialog", "Défier"));
    expect(plain(client(SHOWN("VXV_DuelDialog")))).toContain("Il manque : le joueur défié, la date, l'heure, le lieu.");
    client(typeIn("VXV_DuelDialog", 1, "personne inconnue"));
    client(typeIn("VXV_DuelDialog", 2, "15/12"));
    client(typeIn("VXV_DuelDialog", 3, "21:00"));
    client(typeIn("VXV_DuelDialog", 4, "Porte d'Orgrimmar"));
    client(click("VXV_DuelDialog", "Défier"));
    expect(plain(client(SHOWN("VXV_DuelDialog")))).toContain(
      "Ce personnage n'est lié à aucun membre de la guilde sur le site.",
    );
    client(typeIn("VXV_DuelDialog", 1, "ciel gris"));
    client(click("VXV_DuelDialog", "Défier"));
    expect(client(PENDING)).toEqual([
      expect.objectContaining({ kind: "duel", opponentId: "m-ciel", date: "15/12", time: "21:00" }),
    ]);
    expect(errors()).toEqual([]);
  });

  it("sends the result the game shows of the player's duel, once, whatever the format's order", () => {
    const { client, errors } = startPvp();
    client('DUEL_WINNER_KNOCKOUT = "%1$s a vaincu %2$s en duel."');
    client('DUEL_WINNER_RETREAT = "%2$s s\'est enfui devant %1$s en duel."');
    client('Fire("CHAT_MSG_SYSTEM", "Ðéjà Vu a vaincu Ciel Gris en duel.")');
    expect(client(PENDING)).toEqual({});
    client('Fire("CHAT_MSG_SYSTEM", "Ciel Gris s\'est enfui devant Thom Leboss en duel.")');
    client('Fire("CHAT_MSG_SYSTEM", "Thom Leboss a vaincu Ciel Gris en duel.")');
    expect(client(PENDING)).toEqual([
      expect.objectContaining({ kind: "duelResult", duelId: "d1", winner: "Thom Leboss", loser: "Ciel Gris" }),
    ]);
    expect(errors()).toEqual([]);
  });

  it("leaves the result to the loser when the client has no duel format", () => {
    const { client, errors } = startPvp();
    client('Fire("CHAT_MSG_SYSTEM", "Thom Leboss a vaincu Ciel Gris en duel.")');
    expect(client(PENDING)).toEqual({});
    expect(errors()).toEqual([]);
  });

  it("lets an officer create an outing for a role", () => {
    const { client, errors } = startPvp("Ðéjà Vu", { pvp: formatAddonPvp(PVP), raidroles: ROLES });
    client(click("VXV_Window", "Créer"));
    client(typeIn("VXV_OutingDialog", 1, "Raid sur Astranaar"));
    client(typeIn("VXV_OutingDialog", 2, "15/12"));
    client(typeIn("VXV_OutingDialog", 3, "21:00"));
    client(typeIn("VXV_OutingDialog", 4, "Sortie du lundi"));
    client(click("VXV_OutingDialog", "Créer"));
    expect(plain(client(SHOWN("VXV_OutingDialog")))).toContain("Il manque : qui peut s'inscrire (flèches).");
    client(click("VXV_OutingDialog", "<"));
    client(click("VXV_OutingDialog", "Créer"));
    expect(client(PENDING)).toEqual([
      expect.objectContaining({
        kind: "pvpEvent",
        title: "Raid sur Astranaar",
        roleId: "r1",
        reason: "Sortie du lundi",
      }),
    ]);
    expect(errors()).toEqual([]);
  });

  it("hides the outing's creation from a member, and tells the website's answers", () => {
    // Exported later: the addon keeps newer data only.
    const answered = formatAddonPvp({
      ...PVP,
      exportedAt: new Date(EXPORTED.getTime() + 60_000),
      changes: [
        {
          id: "Thom Leboss#1#1",
          eventId: undefined,
          betId: undefined,
          duelId: "d2",
          author: "Thom Leboss",
          accepted: true,
          message: "Défi relevé.",
        },
      ],
    });
    const started = startPvp();
    const { client, errors } = started;
    expect(client('return IsVisible(FindButton(VXV_Window, "Créer"))')).toBe(false);
    client(clickRow("Ciel Gris contre Thom Leboss"));
    client(click("VXV_DuelActions", "Relever le défi"));
    const id = client("local id = next(VXV_DB.modules.pvp.pending) return id") as string;
    loadedBundle(started, "VXV_PvP").run(
      `local _, ns = ... ns.PvpData.Receive(${JSON.stringify(answered.replace("Thom Leboss#1#1", id))}, "Ðéjà Vu")`,
    );
    expect(client("return Printed")).toContain(`${PREFIX}Site VXV : Défi relevé.`);
    expect(client(PENDING)).toEqual({});
    expect(errors()).toEqual([]);
  });
});
