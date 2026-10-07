import { describe, expect, it } from "vitest";
import { startGuild } from "../guild.ts";
import { companionFiles } from "../sync/fixtures.ts";
import { BOSS_TEN, parisText, stake, startParis, TAVERN_BETS, TITLE } from "./fixtures.ts";

const PREFIX = "|cff14b8a6VXV|r ";
const OPEN_TAB = (name: string) => `
  SlashCmdList.VXV("")
  FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "${name}" end):Run("OnClick")
`;
/** The texts of the rows shown under a frame, top to bottom, panel after panel. */
const ROWS = (frame = "VXV_Window") => `
  local texts = {}
  FindWidget(${frame}, function(widget)
      if widget.row ~= nil and widget.shown then texts[#texts + 1] = widget.label.text end
  end)
  return texts
`;
const CLICK_TITLE = `FindWidget(VXV_Window, function(w) return w.row ~= nil and w.shown and w.label.text == ${JSON.stringify(TITLE)} end):Run("OnMouseUp")`;
const choose = (label: string) =>
  `FindWidget(VXV_StakeDialog, function(w) return w.SetSelected and w.shown and w.label.text == ${JSON.stringify(label)} end):Run("OnClick")`;
const amount = (value: string) =>
  `FindWidget(VXV_StakeDialog, function(w) return w.kind == "EditBox" end):SetText(${JSON.stringify(value)})`;
const OUTBOX = `
  local list = {}
  for _, change in pairs(VXV_SyncDB.changes) do list[#list + 1] = change end
  return list
`;
/** The changes the outbox holds for the companion, as a list (an empty Lua table reads as an object). */
const outbox = (client: (code: string) => unknown): unknown[] => {
  const list = client(OUTBOX);
  return Array.isArray(list) ? list : [];
};
const PENDING_ID = `local id = next(VXV_DB.modules.paris.pending) return id`;
/** French typography keeps numbers and units together: plain spaces here. */
const plain = (texts: unknown) => (texts as string[]).map((text) => text.replace(/[\u00a0\u202f]/gu, " "));

describe("Le Dé Pipé in game (P11.8)", () => {
  it("shows the open bets the companion brought, with their odds and the player's stake", () => {
    const { client, errors } = startParis();
    client(OPEN_TAB("Le Dé Pipé"));
    const rows = plain(client(ROWS()));
    expect(rows.slice(0, 5)).toEqual([
      TITLE,
      expect.stringMatching(/^Ferme le \d\d\/12 \d\d:\d\d · cagnotte 200 po · 2 parieurs$/u),
      "Un tank · 25 % · 50 po · × 3,60",
      "Un heal · 75 % · 150 po · × 1,20",
      "Ma mise : 50 po sur « Un tank » · à payer · gain possible 180 po",
    ]);
    expect(rows).toContain(`${TITLE} : 50 po sur « Un tank » · à payer`);
    expect(rows).toContain("Solde : 380 po");
    expect(rows).toContain("Ce mois : +500 po, −120 po");
    expect(errors()).toEqual([]);
  });

  it("stakes in game: waiting for the website, handed to the companion, then settled by its answer", () => {
    const { client, paris, errors } = startParis({ playerName: "Thom Leboss" });
    client(OPEN_TAB("Le Dé Pipé"));
    client(CLICK_TITLE);
    expect(client("return VXV_StakeDialog.shown")).toBe(true);
    client(choose("Un tank"));
    client(amount("20"));
    client('FindButton(VXV_StakeDialog, "Miser"):Run("OnClick")');
    expect(outbox(client)).toEqual([
      expect.objectContaining({ kind: "stake", betId: "b1", choiceId: "tank", amount: 20, author: "Thom Leboss" }),
    ]);
    expect(plain(client(ROWS()))).toContain("En attente du site : 20 po sur « Un tank »");
    const id = client(PENDING_ID) as string;
    const answered = parisText({
      ...TAVERN_BETS,
      exportedAt: new Date("2026-12-10T07:40:00Z"),
      changes: [
        { id, eventId: undefined, betId: "b1", author: "Thom Leboss", accepted: true, message: "Mise enregistrée." },
      ],
    });
    paris.run(`local _, ns = ... ns.BetsData.FromCompanion(${JSON.stringify(answered)})`);
    expect(outbox(client)).toEqual([]);
    expect(client("return Printed")).toContain(`${PREFIX}Site VXV : Mise enregistrée.`);
    expect(errors()).toEqual([]);
  });

  it("lets an officer open a bet in game: waiting for the website, then settled by its answer", () => {
    const { client, paris, errors } = startParis();
    client(OPEN_TAB("Le Dé Pipé"));
    client('FindButton(VXV_Window, "Ouvrir un pari"):Run("OnClick")');
    expect(client("return VXV_BetDialog.shown")).toBe(true);
    // Without its choices, the bet waits.
    client('FindButton(VXV_BetDialog, "Ouvrir le pari"):Run("OnClick")');
    expect(outbox(client)).toEqual([]);
    client(`
      local boxes = {}
      FindWidget(VXV_BetDialog, function(w) if w.kind == "EditBox" then boxes[#boxes + 1] = w end end)
      boxes[1]:SetText("Qui meurt en premier ?")
      boxes[2]:SetText("Un tank ; Un heal ;")
      boxes[3]:SetText("15/12")
      boxes[4]:SetText("21:00")
      boxes[5]:SetText("Pour le raid")
      FindButton(VXV_BetDialog, "Ouvrir le pari"):Run("OnClick")
    `);
    expect(outbox(client)).toEqual([
      expect.objectContaining({
        kind: "bet",
        title: "Qui meurt en premier ?",
        choices: ["Un tank", "Un heal"],
        date: "15/12",
        time: "21:00",
        reason: "Pour le raid",
        author: "Ðéjà Vu",
      }),
    ]);
    expect(plain(client(ROWS()))).toContain("En attente du site : pari « Qui meurt en premier ? »");
    const id = client(PENDING_ID) as string;
    const message = "Pari « Qui meurt en premier ? » ouvert et annoncé sur Discord.";
    const answered = parisText({
      ...TAVERN_BETS,
      exportedAt: new Date("2026-12-10T07:40:00Z"),
      changes: [{ id, eventId: undefined, betId: "b2", author: "Ðéjà Vu", accepted: true, message }],
    });
    paris.run(`local _, ns = ... ns.BetsData.FromCompanion(${JSON.stringify(answered)})`);
    expect(outbox(client)).toEqual([]);
    expect(client("return Printed")).toContain(`${PREFIX}Site VXV : ${message}`);
    expect(errors()).toEqual([]);
  });

  it("shows the bet's opening to the officers only", () => {
    const { client } = startParis({ playerName: "Thom Leboss" });
    client(OPEN_TAB("Le Dé Pipé"));
    expect(client('return IsVisible(FindButton(VXV_Window, "Ouvrir un pari"))')).toBe(false);
  });

  it("asks for a whole number of gold pieces and a choice", () => {
    const { client } = startParis({ playerName: "Thom Leboss" });
    client(OPEN_TAB("Le Dé Pipé"));
    client(CLICK_TITLE);
    client(choose("Un tank"));
    client(amount("2,5"));
    client('FindButton(VXV_StakeDialog, "Miser"):Run("OnClick")');
    expect(
      client(
        `return FindWidget(VXV_StakeDialog, function(w) return w.text == "Mise en pièces d'or entières, 1 po au moins." end) ~= nil`,
      ),
    ).toBe(true);
    expect(outbox(client)).toEqual([]);
  });

  it("takes the player's stake back, and tells a character linked to nobody how to link it", () => {
    const { client } = startParis();
    client(OPEN_TAB("Le Dé Pipé"));
    client(CLICK_TITLE);
    client('FindButton(VXV_StakeDialog, "Retirer ma mise"):Run("OnClick")');
    expect(outbox(client)).toEqual([expect.objectContaining({ kind: "withdraw", betId: "b1" })]);

    const stranger = startParis({ playerName: "Aube Claire" });
    stranger.client(OPEN_TAB("Le Dé Pipé"));
    stranger.client(CLICK_TITLE);
    expect(stranger.client("return VXV_StakeDialog ~= nil and VXV_StakeDialog.shown")).toBe(false);
    expect(stranger.client("return Printed")).toContain(
      `${PREFIX}Ce personnage n'est lié à aucun membre sur le site : lie-le avec /vxv_main ou /vxv_reroll.`,
    );
  });

  it("shows the player's debt, the bet on the Taverne's card and in the reduced mode", () => {
    const lost = {
      ...TAVERN_BETS,
      bets: [
        ...TAVERN_BETS.bets,
        {
          bet: {
            ...BOSS_TEN,
            id: "b0",
            title: "Pari d'hier",
            endedAt: new Date("2026-12-09T22:00:00Z"),
            winningChoiceId: "heal",
          },
          stakes: [{ ...stake("m-deja", "Ðéjà Vu", "tank", 50), betId: "b0", outcome: "lost" as const, gain: 0 }],
        },
      ],
    };
    const { client } = startParis({ facts: lost });
    client(OPEN_TAB("Le Dé Pipé"));
    expect(client(`return FindWidget(VXV_Window, function(w) return w.text == "Dette : 50 po" end) ~= nil`)).toBe(true);
    client(OPEN_TAB("Taverne"));
    expect(
      client(`return FindWidget(VXV_Window, function(w) return w.text == ${JSON.stringify(TITLE)} end) ~= nil`),
    ).toBe(true);
    client('VXV_Window.reduce:Run("OnClick")');
    client(
      'FindWidget(VXV_CompactWindow, function(w) return w.SetSelected and w.label.text == "Paris" end):Run("OnClick")',
    );
    expect(plain(client(ROWS("VXV_CompactWindow")))[0]).toBe(TITLE);
  });

  it("shows the guild's cash on the Journal's left page", () => {
    const { client } = startParis({ withRaid: true });
    client(OPEN_TAB("Journal"));
    const texts = plain(
      client(`
        local texts = {}
        FindWidget(VXV_Window, function(w) if w.kind == "FontString" and w.text ~= nil then texts[#texts + 1] = w.text end end)
        return texts
      `),
    );
    expect(texts).toEqual(expect.arrayContaining(["Solde : 380 po", "Ce mois : +500 po, −120 po"]));
  });

  it("passes the bets on to the guild from an officer, who relays the stakes of a member without companion", () => {
    const guild = startGuild(["Thom Leboss"], { bundles: ["VXV_Paris", "VXV_Sync"] });
    guild.join("Ðéjà Vu", { written: companionFiles({ paris: parisText() }) });
    for (let carried = 1; carried > 0;) {
      guild.advanceTime(5);
      carried = guild.deliver();
    }
    const thom = guild.player("Thom Leboss");
    thom.client(OPEN_TAB("Le Dé Pipé"));
    expect(plain(thom.client(ROWS()))[0]).toBe(TITLE);
    thom.client(CLICK_TITLE);
    thom.client(choose("Un heal"));
    thom.client(amount("10"));
    thom.client('FindButton(VXV_StakeDialog, "Miser"):Run("OnClick")');
    expect(thom.client("return Printed")).toContain(
      `${PREFIX}Changement enregistré : un officier équipé du compagnon VXV le relaiera au site.`,
    );
    guild.deliver();
    expect(outbox(guild.player("Ðéjà Vu").client)).toEqual([
      expect.objectContaining({ kind: "stake", author: "Thom Leboss", choiceId: "heal", amount: 10 }),
    ]);
  });
});
