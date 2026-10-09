import { describe, expect, it } from "vitest";
import { startGuild } from "../guild.ts";
import { companionFiles } from "../sync/fixtures.ts";
import { ONYXIA_NIGHT, ONYXIA_PACK, RAIDER_ROLE, roleChoicesText, startRaid, websiteText } from "./fixtures.ts";

const PREFIX = "|cff14b8a6VXV|r ";
const BUNDLES = ["VXV_Raid", "VXV_Sync"];
const PENDING = `
  local list = {}
  for _, change in pairs(VXV_DB.modules.raid.pending) do list[#list + 1] = change end
  return list
`;
const OUTBOX = `
  local list = {}
  for _, change in pairs(VXV_SyncDB.changes) do list[#list + 1] = change end
  return list
`;
const ME_ROWS = `
  local _, ns = ...
  local texts = {}
  for _, row in ipairs(ns.RaidView.Me(ns.RaidData.Current(), VXV.PlayerName())) do texts[#texts + 1] = row.text end
  return texts
`;
const click = (frame: string, text: string) => `FindButton(${frame}, ${JSON.stringify(text)}):Run("OnClick")`;
const OPEN_RAID = 'SlashCmdList.VXV("") ' + click("VXV_Window.header", "Raid");
const SHOWN = (text: string) =>
  `local button = FindButton(VXV_Window, ${JSON.stringify(text)}) return button and button.shown`;
const type = (frame: string, text: string) =>
  `FindWidget(${frame}, function(widget) return widget.kind == "EditBox" and IsVisible(widget) end):SetText(${JSON.stringify(text)})`;

/** Thom Leboss, a member of the tests' event, with the companion and the raid's data pack. */
function member() {
  const started = startRaid({ playerName: "Thom Leboss", written: companionFiles({ raid: websiteText() }) });
  started.client(ONYXIA_PACK);
  started.client(OPEN_RAID);
  return started;
}

describe("changes made in game", () => {
  it("signs up from the Raid screen: waiting for the website, handed over to the companion", () => {
    const { client, raid, errors } = member();
    client(click("VXV_Window", "Changer"));
    client(click("VXV_SignupDialog", "Tank"));
    client(type("VXV_SignupDialog", "Protection"));
    client(click("VXV_SignupDialog", "Présent"));
    client(click("VXV_SignupDialog", "Envoyer"));
    const [change] = client(PENDING) as unknown as Record<string, unknown>[];
    expect(change).toMatchObject({
      eventId: "e1",
      author: "Thom Leboss",
      kind: "signup",
      role: "tank",
      spec: "Protection",
      status: "present",
    });
    expect(String(change?.id)).toMatch(/^Thom Leboss#\d+#\d+$/);
    expect(client(OUTBOX)).toEqual([change]);
    expect(client("return Printed")).toContain(
      `${PREFIX}Changement enregistré : ton compagnon l'enverra au site au prochain /reload.`,
    );
    expect(raid.run(ME_ROWS)).toContain("|cfff2c94cEn attente du site : Tank · Protection · Présent|r");
    expect(errors()).toEqual([]);
  });

  it("asks for every field of the sign-up", () => {
    const { client } = member();
    client(click("VXV_Window", "Changer"));
    client(type("VXV_SignupDialog", "  "));
    client(click("VXV_SignupDialog", "Envoyer"));
    expect(client(PENDING)).toEqual({});
    expect(
      client(
        'return FindWidget(VXV_SignupDialog, function(w) return w.text == "Choisis ton rôle, ta spécialisation et ton statut." end) ~= nil',
      ),
    ).toBe(true);
  });

  it("chooses soft reserves among the raid's loot, within the allowance, excluded items aside", () => {
    const { client } = member();
    client(click("VXV_Window", "Choisir"));
    const rows = `
      local texts = {}
      FindWidget(VXV_ItemChoice, function(widget)
          if widget.row ~= nil and widget.shown then texts[#texts + 1] = widget.label.text end
      end)
      return texts
    `;
    expect(client(rows)).toEqual([
      "Onyxia",
      "|cfff2c94c[x] |r|cfff2c94cTête d'Onyxia|r",
      "[  ] |cffc58bffSac en peau|r",
      "|cffa49bbdÉcaille d'Onyxia (exclu)|r",
      "[  ] |cffc58bffBâton du dragon|r",
      "Gardienne",
      "[  ] |cffc58bffCape de la gardienne|r",
    ]);
    const choose = (name: string) =>
      client(
        `FindWidget(VXV_ItemChoice, function(w) return w.row ~= nil and w.shown and tostring(w.label.text):find(${JSON.stringify(name)}, 1, true) end):Run("OnMouseUp")`,
      );
    choose("Sac en peau");
    choose("Bâton du dragon");
    expect(
      client(`return FindWidget(VXV_ItemChoice, function(w) return w.text == "Tu as droit à 2 SR." end) ~= nil`),
    ).toBe(true);
    choose("Tête d'Onyxia");
    choose("Bâton du dragon");
    client(click("VXV_ItemChoice", "Envoyer"));
    expect(client(PENDING)).toEqual([expect.objectContaining({ kind: "reserves", itemIds: [21, 40] })]);
  });

  it("lets an officer exclude items, with the reason the journal keeps", () => {
    const { client } = startRaid({ written: companionFiles({ raid: websiteText() }) });
    client(ONYXIA_PACK);
    client(OPEN_RAID);
    client(click("VXV_Window", "Exclure des objets"));
    client(
      `FindWidget(VXV_ItemChoice, function(w) return w.row ~= nil and w.shown and tostring(w.label.text):find("Sac en peau", 1, true) end):Run("OnMouseUp")`,
    );
    client(click("VXV_ItemChoice", "Envoyer"));
    expect(client(PENDING)).toEqual({});
    client(type("VXV_ItemChoice", "Pour le tank principal"));
    client(click("VXV_ItemChoice", "Envoyer"));
    expect(client(PENDING)).toEqual([
      expect.objectContaining({ kind: "exclusion", itemId: 21, excluded: true, reason: "Pour le tank principal" }),
    ]);
  });

  it("closes the reserves at the lock, and the sign-up at the start, as on the website", () => {
    const { client } = member();
    expect(client(SHOWN("Choisir"))).toBe(true);
    // The Journal, then the Raid screen again: it shows what the time allows.
    const reopen = `${click("VXV_Window.header", "Journal")} ${click("VXV_Window.header", "Raid")}`;
    client(`AdvanceTime(${String(7 * 3600 + 31 * 60)})`);
    client(reopen);
    expect(client(SHOWN("Choisir"))).toBe(false);
    expect(client(SHOWN("Changer"))).toBe(true);
    client(`AdvanceTime(${String(30 * 60)})`);
    client(reopen);
    expect(client(SHOWN("Changer"))).toBe(false);
  });

  it("learns the website's answer with the event's data, and forgets the change", () => {
    const { client, raid } = member();
    raid.run('local _, ns = ... ns.Changes.Submit({ kind = "reserves", itemIds = { 40, 99 } })');
    const [change] = client(PENDING) as unknown as { id: string }[];
    const answered = websiteText({
      ...ONYXIA_NIGHT,
      exportedAt: new Date("2026-12-10T19:50:00Z"),
      changes: [
        {
          id: change?.id ?? "",
          eventId: "e1",
          betId: undefined,
          duelId: undefined,
          missionId: undefined,
          author: "Thom Leboss",
          accepted: false,
          message: "Un des objets choisis ne tombe pas dans les raids de cet événement.",
        },
      ],
    });
    raid.run(`local _, ns = ... ns.RaidData.Receive(${JSON.stringify(answered)}, "Ðéjà Vu")`);
    expect(client(PENDING)).toEqual({});
    expect(client(OUTBOX)).toEqual({});
    expect(client("return Printed")).toContain(
      `${PREFIX}Site VXV, changement refusé : Un des objets choisis ne tombe pas dans les raids de cet événement.`,
    );
  });
});

const SHOWN_TEXTS = (frame: string) => `
  local texts = {}
  FindWidget(${frame}, function(w) if w.kind == "FontString" and w.text ~= nil then texts[#texts + 1] = w.text end end)
  return texts
`;

describe("events created in game (P9.2)", () => {
  it("lets an officer create an event: date and time as on Discord, raids, soft reserves, role and reason", () => {
    const { client, errors } = startRaid({
      written: companionFiles({ raid: websiteText(), raidroles: roleChoicesText() }),
    });
    client(ONYXIA_PACK);
    client(OPEN_RAID);
    client(click("VXV_Window", "Créer un événement"));
    expect(client(SHOWN_TEXTS("VXV_EventDialog"))).toContain("Choisis un rôle avec les flèches.");
    client(click("VXV_EventDialog", "Créer"));
    expect(client(PENDING)).toEqual({});
    expect(client(SHOWN_TEXTS("VXV_EventDialog"))).toContain(
      "Il manque : la date, l'heure, un raid, qui peut s'inscrire (flèches), le motif.",
    );
    client(`
      local boxes = {}
      local function walk(frame)
        for _, child in ipairs(frame.children or {}) do
          if child.kind == "EditBox" then boxes[#boxes + 1] = child end
          walk(child)
        end
      end
      walk(VXV_EventDialog)
      boxes[1]:SetText("15/12") boxes[2]:SetText("21:00") boxes[3]:SetText("Raid du lundi")
    `);
    client(click("VXV_EventDialog", "Repaire d'Onyxia"));
    client(click("VXV_EventDialog", "+"));
    // Who may sign up is chosen, never assumed.
    client(click("VXV_EventDialog", "Créer"));
    expect(client(PENDING)).toEqual({});
    expect(client(SHOWN_TEXTS("VXV_EventDialog"))).toContain("Il manque : qui peut s'inscrire (flèches).");
    client(click("VXV_EventDialog", "<"));
    expect(client(SHOWN_TEXTS("VXV_EventDialog"))).toContain("Raideur R1");
    client(click("VXV_EventDialog", ">"));
    expect(client(SHOWN_TEXTS("VXV_EventDialog"))).toContain("Tout le monde");
    client(click("VXV_EventDialog", ">"));
    client(click("VXV_EventDialog", "Créer"));
    expect(client(PENDING)).toEqual([
      expect.objectContaining({
        kind: "event",
        date: "15/12",
        time: "21:00",
        raidIds: ["onyxia"],
        softReserves: 2,
        roleId: RAIDER_ROLE.id,
        reason: "Raid du lundi",
      }),
    ]);
    expect(errors()).toEqual([]);
  });

  it("tells an officer whose companion has not brought the roles yet", () => {
    const { client, errors } = startRaid({ written: companionFiles({ raid: websiteText() }) });
    client(ONYXIA_PACK);
    client(OPEN_RAID);
    client(click("VXV_Window", "Créer un événement"));
    expect(client(SHOWN_TEXTS("VXV_EventDialog"))).toContain(
      "Rôles pas encore reçus : ton compagnon VXV les apporte au /reload.",
    );
    client(click("VXV_EventDialog", ">"));
    expect(errors()).toEqual([]);
  });
});

describe("relaying the changes of the members without the companion", () => {
  it("an officer with the companion keeps them for the website; nobody else does", () => {
    const guild = startGuild(["Thom Leboss", "Ciel Gris"], { bundles: BUNDLES });
    guild.join("Ðéjà Vu", { written: companionFiles({ raid: websiteText() }) });
    for (let second = 0; second < 90; second += 1) {
      guild.deliver();
      guild.advanceTime(1);
    }
    guild
      .player("Thom Leboss")
      .bundles.VXV_Raid?.run('local _, ns = ... ns.Changes.Submit({ kind = "reserves", itemIds = { 21 } })');
    // A forged change, whose id is not the sender's, is not relayed.
    guild
      .player("Thom Leboss")
      .client(
        'VXV.Broadcast("raid.change", { id = "Ciel Gris#1#1", eventId = "e1", kind = "reserves", itemIds = { 20 } })',
      );
    for (let second = 0; second < 30; second += 1) {
      guild.deliver();
      guild.advanceTime(1);
    }
    expect(guild.player("Thom Leboss").client("return Printed")).toContain(
      `${PREFIX}Changement enregistré : un officier équipé du compagnon VXV le relaiera au site.`,
    );
    expect(guild.player("Ðéjà Vu").client(OUTBOX)).toEqual([
      expect.objectContaining({ author: "Thom Leboss", kind: "reserves", itemIds: [21] }),
    ]);
    expect(guild.player("Ciel Gris").client("return VXV_SyncDB.changes")).toEqual({});
    for (const player of guild.players) {
      expect(player.errors()).toEqual([]);
    }
  });
});
