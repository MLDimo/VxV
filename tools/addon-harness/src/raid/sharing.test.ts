import type { AddonEventFacts } from "@vxv/server/domain/addonExport";
import type { Character } from "@vxv/server/domain/characters";
import { describe, expect, it } from "vitest";
import { startGuild } from "../guild.ts";
import { importText, ONYXIA_NIGHT, websiteText } from "./fixtures.ts";

const RAID = { bundles: ["VXV_Raid"] };
const PREFIX = "|cff14b8a6VXV|r ";
const EVENT = `
  local _, ns = ...
  local event = ns.RaidData.Current()
  local _, sender = ns.RaidData.Text()
  return event and { title = event.title, exportedAt = event.exportedAt, signups = #event.signups, sender = sender }
`;
/** Counts the event's data this player sends, by wrapping the public API. */
/** Counts the event's data a player receives, by sender. */
const COUNT_DATA_RECEIVED = `
  DataFrom = {}
  VXV.OnMessage("raid.data", function(_, sender) DataFrom[sender] = (DataFrom[sender] or 0) + 1 end)
`;

type Guild = ReturnType<typeof startGuild>;

/** Carries messages and moves the clocks until the send queues are empty. */
function settle(guild: Guild, seconds = 90): void {
  for (let second = 0; second < seconds; second += 1) {
    guild.deliver();
    guild.advanceTime(1);
  }
  guild.deliver();
}

function character(name: string): Character {
  const [firstName = "", lastName = ""] = name.split(" ");
  return {
    id: `c-${firstName}`,
    firstName,
    lastName,
    characterClass: "ROGUE",
    memberId: `m-${firstName}`,
    isMain: true,
    inGuild: true,
  };
}

function night(changes: Partial<AddonEventFacts>): AddonEventFacts {
  return { ...ONYXIA_NIGHT, ...changes };
}

const eventOf = (guild: Guild, name: string) => guild.player(name).bundles.VXV_Raid?.run(EVENT);
const printedBy = (guild: Guild, name: string) => guild.player(name).client("return Printed") as unknown as string[];

describe("sharing the event in the guild", () => {
  it("sends an officer's import to every member connected with VXV", () => {
    const guild = startGuild(["Ðéjà Vu", "Thom Leboss", "Ciel Gris"], RAID);
    settle(guild);
    importText(guild.player("Ðéjà Vu").client, websiteText());
    settle(guild);
    for (const name of ["Thom Leboss", "Ciel Gris"]) {
      expect(eventOf(guild, name)).toEqual({ title: "Onyxia", exportedAt: 1796931900, signups: 3, sender: "Ðéjà Vu" });
      // The data arrive without a word in the chat.
      expect(guild.player(name).client("return Printed")).toEqual({});
    }
    expect(printedBy(guild, "Ðéjà Vu")).toContain(
      `${PREFIX}Données envoyées aux membres de la guilde connectés avec VXV.`,
    );
    for (const player of guild.players) {
      expect(player.errors()).toEqual([]);
    }
  });

  it("carries a full raid of 40 players with their soft reserves and the officers' changes", () => {
    const names = Array.from({ length: 40 }, (_, index) => `Joueur${index} Raideur${index}`);
    const big = night({
      signups: names.map((name, index) => ({
        eventId: "e1",
        memberId: `m${index}`,
        characterId: `c${index}`,
        characterName: name,
        characterClass: "MAGE",
        role: "dps",
        spec: "Givre",
        status: "present",
        signedUpAt: new Date("2026-12-01T12:00:00Z"),
      })),
      board: ONYXIA_NIGHT.board.map((item) => ({
        ...item,
        reservedBy: item.excluded
          ? []
          : names.map((name, index) => ({
              characterId: `c${index}`,
              characterName: name,
              characterClass: "MAGE",
              bonus: 10,
            })),
      })),
      journal: Array.from({ length: 10 }, () => ONYXIA_NIGHT.journal[0]).filter((entry) => entry !== undefined),
    });
    const text = websiteText(big);
    expect(text.length).toBeGreaterThan(3000);

    const guild = startGuild(["Ðéjà Vu", "Thom Leboss"], RAID);
    settle(guild);
    importText(guild.player("Ðéjà Vu").client, text);
    settle(guild);
    expect(eventOf(guild, "Thom Leboss")).toMatchObject({ signups: 40 });
  });

  it("brings a member who logs in later up to date, from one officer only", () => {
    const officers = night({ officers: [character("Ðéjà Vu"), character("Aube Claire")] });
    const guild = startGuild(["Ðéjà Vu", "Aube Claire"], RAID);
    settle(guild);
    importText(guild.player("Ðéjà Vu").client, websiteText(officers));
    settle(guild);

    guild.join("Thom Leboss").client(COUNT_DATA_RECEIVED);
    settle(guild);
    expect(eventOf(guild, "Thom Leboss")).toMatchObject({ title: "Onyxia", sender: "Aube Claire" });
    // Aube Claire comes first in alphabetical order: she answers, and Ðéjà Vu stands back after her offer.
    expect(guild.player("Thom Leboss").client("return DataFrom")).toEqual({ "Aube Claire": 1 });
  });

  it("ignores data sent by a member the website does not name officer", () => {
    const guild = startGuild(["Ðéjà Vu", "Thom Leboss"], RAID);
    settle(guild);
    importText(guild.player("Ðéjà Vu").client, websiteText());
    settle(guild);
    const forged = websiteText(
      night({ officers: [character("Thom Leboss")], exportedAt: new Date("2026-12-10T19:50:00Z") }),
    );
    guild.player("Thom Leboss").client(`VXV.Broadcast("raid.data", { text = ${JSON.stringify(forged)} })`);
    settle(guild);
    expect(eventOf(guild, "Ðéjà Vu")).toMatchObject({ exportedAt: 1796931900, sender: "Ðéjà Vu" });
  });

  it("keeps an officer's changes, with their reason, for the Journal, without a word in the chat", () => {
    const guild = startGuild(["Ðéjà Vu", "Thom Leboss"], RAID);
    settle(guild);
    importText(guild.player("Ðéjà Vu").client, websiteText());
    settle(guild);
    const later = night({
      exportedAt: new Date("2026-12-10T19:55:00Z"),
      journal: [
        ...ONYXIA_NIGHT.journal,
        {
          id: "8",
          occurredAt: new Date("2026-12-10T19:50:00Z"),
          actorName: "Officier",
          action: "softReserve.override",
          entity: "softReserve",
          entityId: "e1/c-thom",
          before: null,
          after: {
            characterName: "Thom Leboss",
            raids: ["Onyxia"],
            eventStartsAt: "2026-12-10T20:00:00.000Z",
            before: ["Sac en peau"],
            after: ["Tête d'Onyxia"],
          },
          reason: "Échange demandé en vocal",
        },
      ],
    });
    importText(guild.player("Ðéjà Vu").client, websiteText(later));
    settle(guild);
    expect(
      guild
        .player("Thom Leboss")
        .bundles.VXV_Raid?.run(
          "local _, ns = ... local journal = ns.RaidData.Current().journal return journal[#journal]",
        ),
    ).toMatchObject({
      actor: "Officier",
      summary:
        "SR corrigées par un officier : SR de Thom Leboss (Onyxia, 10/12/2026 21:00) : avant « Sac en peau », après " +
        "« Tête d'Onyxia »",
      reason: "Échange demandé en vocal",
    });
    expect(JSON.stringify(guild.player("Thom Leboss").client("return Printed"))).not.toContain("Modification");
  });
});

describe("freshness of the officers' data", () => {
  it("shows an officer, on the Raid screen, that their copy predates the lock", () => {
    const guild = startGuild(["Ðéjà Vu"], RAID);
    const officer = guild.player("Ðéjà Vu");
    importText(officer.client, websiteText(night({ exportedAt: new Date("2026-12-10T11:00:00Z") })));
    const lockBadge = () =>
      officer.bundles.VXV_Raid?.run(`local _, ns = ...
        local badges = ns.RaidView.Header(ns.RaidData.Current(), nil, time()).badges
        return badges[#badges].text`);
    expect(lockBadge()).toMatch(/^SR verrouillées dans /u);

    // From 12:00 to 19:35: the lock passed at 19:30.
    guild.advanceTime(7 * 3600 + 35 * 60);
    expect(lockBadge()).toBe("Données d'avant le verrouillage : recharge-les");
    expect(JSON.stringify(officer.client("return Printed"))).not.toContain("SR verrouillées");
  });
});
