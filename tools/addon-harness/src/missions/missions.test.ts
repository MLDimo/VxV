import { describe, expect, it } from "vitest";
import { startGuild } from "../guild.ts";
import { EXPORTED } from "../siteFixtures.ts";
import { companionFiles } from "../sync/fixtures.ts";
import { GUILD_QUESTS, mission, questsText, startQuests } from "./fixtures.ts";

const OPEN_TAB = (name: string) => `
  SlashCmdList.VXV("")
  FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "${name}" end):Run("OnClick")
`;
const ROWS = (frame = "VXV_Window") => `
  local texts = {}
  FindWidget(${frame}, function(widget)
      if widget.row ~= nil and widget.shown then texts[#texts + 1] = widget.label.text end
  end)
  return texts
`;
/** The texts shown in a frame, and the pictures. */
const SHOWN = (frame = "VXV_Window") => `
  local texts = {}
  FindWidget(${frame}, function(w) if w.kind == "FontString" and w.text ~= nil and IsVisible(w) then texts[#texts + 1] = tostring(w.text) end end)
  return texts
`;
const PICTURES = `
  local paths = {}
  FindWidget(VXV_Window, function(w) if w.path ~= nil and IsVisible(w) then paths[#paths + 1] = w.path end end)
  return paths
`;
const MEDIA = "Interface\\AddOns\\VXV_Missions\\Media\\";
const PENDING = `
  local list = {}
  for _, change in pairs(VXV_DB.modules.quetes.pending) do list[#list + 1] = change end
  return list
`;
const click = (frame: string, label: string) =>
  `FindWidget(${frame}, function(w) return w.label and w.label.text == ${JSON.stringify(label)} and IsVisible(w) end):Run("OnClick")`;
const typeIn = (frame: string, index: number, text: string) => `
  local boxes = {}
  FindWidget(${frame}, function(w) if w.kind == "EditBox" then boxes[#boxes + 1] = w end end)
  boxes[${String(index)}]:SetText(${JSON.stringify(text)})
`;
const OUTBOX = `
  local list = {}
  for key, reading in pairs(VXV_SyncDB.counters) do list[#list + 1] = reading end
  return list
`;
/** French typography keeps numbers and units together: plain spaces here; class colors left out. */
const plain = (texts: unknown) =>
  (texts as string[]).map((text) => text.replace(/[\u00a0\u202f]/gu, " ").replace(/\|c\w{8}(.*?)\|r/gu, "$1"));
const outbox = (client: (code: string) => unknown, type?: string): unknown[] => {
  const list = client(OUTBOX);
  return (Array.isArray(list) ? list : []).filter(
    (reading) => type === undefined || (reading as { type: string }).type === type,
  );
};

describe("Les Quêtes in game (P12.3, P12.5, P12.8)", () => {
  it("pins the running quest on its parchment, as the charter's mockup: reward split, ranking, hall of fame", () => {
    const { client, errors } = startQuests();
    client(OPEN_TAB("Quêtes"));
    const texts = plain(client(SHOWN()));
    expect(texts).toEqual(
      expect.arrayContaining([
        "Toute la guilde participe",
        expect.stringMatching(/^Fin dans 3 j \d\d h$/u),
        "QUÊTE DE LA SEMAINE · VICTOIRES HONORABLES",
        "Le Chasseur de têtes",
        "Qui fera le plus de victoires honorables d'ici la fin remporte la récompense : main et rerolls additionnés, " +
          "d'après les compteurs du jeu.",
        "1er · 70 %",
        "1 400 po",
        "3e · 10 %",
        "200 po",
        "Thom Leboss",
        "12",
        "TA PROGRESSION",
        "Rien encore : l'addon VXV relève ton compteur en jeu.",
        "—",
        "Égalité : le premier à atteindre le score",
        "Rien de prévu pour l'instant.",
        "Aucune quête terminée pour l'instant.",
        "Hall of fame",
        "1 800 po · pos. moy. 1,5",
        "Officier",
        "Publier une quête",
      ]),
    );
    expect(client(PICTURES)).toEqual(expect.arrayContaining([`${MEDIA}quest-seal.png`, `${MEDIA}star.png`]));
    expect(client(PICTURES)).not.toContain(`${MEDIA}quest-accomplished.png`);
    expect(errors()).toEqual([]);
  });

  it("pins the quests to come and keeps the history of the ended ones under their stamp", () => {
    const thom = GUILD_QUESTS.missions[0]?.scores ?? [];
    const week = 7 * 24 * 60 * 60 * 1000;
    const before = (weeks: number) => new Date(new Date("2026-12-07T00:00:00Z").getTime() - weeks * week);
    const { client, errors } = startQuests({
      facts: {
        ...GUILD_QUESTS,
        missions: [
          ...GUILD_QUESTS.missions,
          {
            mission: mission("q0", "fishing", "La Main verte", {
              startsAt: new Date("2026-12-14T00:00:00Z"),
              endsAt: new Date("2026-12-21T00:00:00Z"),
            }),
            scores: [],
            rewards: [],
          },
          {
            mission: mission("q-1", "mining", "Cœur de mineur", { startsAt: before(2), endsAt: before(1) }),
            scores: thom,
            rewards: [],
          },
          {
            mission: mission("q-2", "skinning", "Le Dépeceur", {
              startsAt: before(3),
              endsAt: before(2),
              closedAt: before(2),
            }),
            scores: thom,
            rewards: [
              {
                missionId: "q-2",
                rank: 1,
                memberId: "m-thom",
                memberName: "Thom Leboss",
                memberClass: "PRIEST",
                amount: 1400,
                paidAt: EXPORTED,
              },
            ],
          },
        ],
      },
    });
    client(OPEN_TAB("Quêtes"));
    const texts = plain(client(SHOWN()));
    expect(texts).toEqual(
      expect.arrayContaining([
        "Le Chasseur de têtes",
        "La Main verte",
        "Le plus de pêches réussies · 2 000 po",
        expect.stringMatching(/^dans 3 j \d\d h$/u),
        "SEMAINE DERNIÈRE",
        "Cœur de mineur",
        "Minage · en tête Thom Leboss (12)",
        "IL Y A 2 SEMAINES",
        "Le Dépeceur",
        "Dépeçage · gagnée par Thom Leboss (12)",
      ]),
    );
    expect(texts.indexOf("Cœur de mineur")).toBeLessThan(texts.indexOf("Le Dépeceur"));
    expect(client(PICTURES)).toEqual(
      expect.arrayContaining([`${MEDIA}quest-pending.png`, `${MEDIA}quest-accomplished.png`]),
    );
    expect(errors()).toEqual([]);
  });

  it("reads the honorable kills, keeps each change for the companion and climbs the live ranking", () => {
    const { client, errors } = startQuests();
    client("Counters.honorableKills = 100 AdvanceTime(5)");
    expect(outbox(client, "honorableKills")).toEqual([
      { name: "Ðéjà Vu", type: "honorableKills", value: 100, at: 1796904005 },
    ]);
    client("Counters.honorableKills = 120 AdvanceTime(60)");
    expect(outbox(client, "honorableKills")).toEqual([
      { name: "Ðéjà Vu", type: "honorableKills", value: 120, at: 1796904065 },
    ]);
    client(OPEN_TAB("Quêtes"));
    const texts = plain(client(SHOWN()));
    expect(texts).toEqual(expect.arrayContaining(["Toi · Ðéjà Vu", "20", "Thom Leboss", "12", "1er"]));
    expect(texts).toContain("En tête, avec 8 victoires honorables d'avance");
    // In combat, the counters are not read.
    client("InCombat = true Counters.honorableKills = 130 AdvanceTime(60)");
    expect(outbox(client, "honorableKills")).toEqual([expect.objectContaining({ value: 120 })]);
    expect(errors()).toEqual([]);
  });

  it("reads the fishing from the game's statistics", () => {
    const { client } = startQuests();
    client('Counters.statistics[1456] = "12" AdvanceTime(5)');
    expect(outbox(client)).toEqual(expect.arrayContaining([expect.objectContaining({ type: "fishing", value: 12 })]));
  });

  it("counts one gathering per loot window holding a herb, an ore or a leather, as the game does not", () => {
    const { client } = startQuests();
    client(`
      ItemInfo[2447] = { name = "Pacifique", classID = 7, subclassID = 9 }
      ItemInfo[2770] = { name = "Minerai de cuivre", classID = 7, subclassID = 7 }
      ItemInfo[2835] = { name = "Pierre brute", classID = 7, subclassID = 7 }
      ItemInfo[2318] = { name = "Cuir léger", classID = 7, subclassID = 6 }
      ItemInfo[4865] = { name = "Griffe ébréchée", classID = 15, subclassID = 0 }
      local function loot(...) CorpseLinks = { ... } Fire("LOOT_OPENED") end
      loot("|Hitem:2447::|h[Pacifique]|h", "|Hitem:2447::|h[Pacifique]|h")
      loot("|Hitem:2770::|h[Minerai de cuivre]|h", "|Hitem:2835::|h[Pierre brute]|h")
      loot("|Hitem:2318::|h[Cuir léger]|h")
      loot("|Hitem:4865::|h[Griffe ébréchée]|h")
      loot("|Hitem:2447::|h[Pacifique]|h")
    `);
    const gathered = Object.fromEntries(
      outbox(client).map((reading) => {
        const { type, value } = reading as { type: string; value: number };
        return [type, value];
      }),
    );
    expect(gathered).toMatchObject({ herbalism: 2, mining: 1, skinning: 1 });
  });

  it("says when a quest counts what this addon does not read", () => {
    const newer = {
      ...GUILD_QUESTS,
      missions: [{ mission: mission("q2", "cooking" as "fishing", "Le Chef"), scores: [], rewards: [] }],
    };
    const { client } = startQuests({ facts: newer });
    client(OPEN_TAB("Quêtes"));
    expect(plain(client(SHOWN()))).toContain(
      "Ce compteur n'est pas lu en jeu : le site compte les relevés du compagnon.",
    );
  });

  it("shows the quest on the Taverne's card and in the reduced mode", () => {
    const { client } = startQuests();
    client(OPEN_TAB("Taverne"));
    expect(
      client(`return FindWidget(VXV_Window, function(w) return w.text == "Le Chasseur de têtes" end) ~= nil`),
    ).toBe(true);
    client('VXV_Window.reduce:Run("OnClick")');
    client(
      'FindWidget(VXV_CompactWindow, function(w) return w.SetSelected and w.label.text == "Quêtes" end):Run("OnClick")',
    );
    expect(plain(client(ROWS("VXV_CompactWindow")))[0]).toBe("Le Chasseur de têtes");
  });

  it("passes the quests on from an officer, who relays the counters of a member without companion", () => {
    const guild = startGuild(["Thom Leboss"], { bundles: ["VXV_Missions", "VXV_Sync"] });
    guild.join("Ðéjà Vu", { written: companionFiles({ quetes: questsText() }) });
    for (let carried = 1; carried > 0;) {
      guild.advanceTime(5);
      carried = guild.deliver();
    }
    const thom = guild.player("Thom Leboss");
    thom.client(OPEN_TAB("Quêtes"));
    expect(plain(thom.client(SHOWN()))).toContain("Le Chasseur de têtes");
    // Thom Leboss is no officer: no officers' zone.
    expect(plain(thom.client(SHOWN()))).not.toContain("Publier une quête");
    thom.client("Counters.honorableKills = 40");
    guild.advanceTime(60);
    guild.deliver();
    expect(outbox(guild.player("Ðéjà Vu").client)).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Thom Leboss", type: "honorableKills", value: 40 })]),
    );
  });

  it("lets an officer publish a quest in game, and tells the website's answer", () => {
    const started = startQuests();
    const { client, errors } = started;
    client(OPEN_TAB("Quêtes"));
    client(click("VXV_Window", "Publier une quête"));
    client(typeIn("VXV_QuestDialog", 2, "2000"));
    client(typeIn("VXV_QuestDialog", 4, "Quête de la semaine"));
    client(click("VXV_QuestDialog", "Publier"));
    expect(plain(client(SHOWN("VXV_QuestDialog")))).toContain("Il manque : le type (flèches).");
    client(click("VXV_QuestDialog", ">"));
    client(click("VXV_QuestDialog", "Publier"));
    const [change] = client(PENDING) as { id: string }[];
    expect(change).toMatchObject({
      kind: "mission",
      type: "fishing",
      title: "",
      reward: 2000,
      days: 7,
      reason: "Quête de la semaine",
    });
    const message = "Quête « Le Grand Pêcheur » publiée et annoncée sur Discord.";
    const answered = questsText({
      ...GUILD_QUESTS,
      // Exported later: the addon keeps newer data only.
      exportedAt: new Date(EXPORTED.getTime() + 60_000),
      changes: [
        {
          id: change?.id ?? "",
          eventId: undefined,
          betId: undefined,
          duelId: undefined,
          missionId: "q2",
          author: "Ðéjà Vu",
          accepted: true,
          message,
        },
      ],
    });
    started.quests.run(`local _, ns = ... ns.QuestsData.Receive(${JSON.stringify(answered)}, "Ðéjà Vu")`);
    expect(JSON.stringify(client("return Printed"))).not.toContain("Site VXV");
    expect(client(PENDING)).toEqual({});
    expect(errors()).toEqual([]);
  });
});
