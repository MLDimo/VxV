import type { AddonEventFacts } from "@vxv/server/domain/addonExport";
import { describe, expect, it } from "vitest";
import { drawnAbove } from "../strata.ts";
import { companionFiles } from "../sync/fixtures.ts";
import { ONYXIA_NIGHT, ONYXIA_PACK, startRaid, websiteText } from "./fixtures.ts";
import { OFFICER, raidWithData, settle } from "./raidGroup.ts";

const PREFIX = "|cff14b8a6VXV|r ";
/** The second raid of the evening, in its own instance: Rage first, then Anetheron. */
const HYJAL_PACK = `
  VXV_RaidData["mont-hyjal"] = { name = "Mont Hyjal", instanceId = 534, bosses = {
      { encounterId = 618, name = "Rage Froidhiver", loot = { { itemId = 50, name = "Plastron du givre" } } },
      { encounterId = 619, name = "Anetheron", loot = { { itemId = 60, name = "Lame d'Anetheron" } } },
  } }
`;
const reserver = (bonus: number) => ({
  characterId: "c-thom",
  characterName: "Thom Leboss",
  characterClass: "PRIEST",
  bonus,
});

/** Onyxia then Mont Hyjal the same evening: Thom Leboss reserved the Tête d'Onyxia and the Lame d'Anetheron. */
const TWO_INSTANCES: AddonEventFacts = {
  ...ONYXIA_NIGHT,
  event: {
    ...ONYXIA_NIGHT.event,
    raids: [
      { id: "onyxia", name: "Onyxia" },
      { id: "mont-hyjal", name: "Mont Hyjal" },
    ],
  },
  board: [
    ...ONYXIA_NIGHT.board.filter((item) => item.itemId !== 20),
    {
      itemId: 20,
      name: "Tête d'Onyxia",
      raidName: "Onyxia",
      bossName: "Onyxia",
      kind: undefined,
      reservedBy: [reserver(20)],
      alreadyOwnedBy: 0,
      excluded: false,
      mine: false,
    },
    {
      itemId: 60,
      name: "Lame d'Anetheron",
      raidName: "Mont Hyjal",
      bossName: "Anetheron",
      kind: undefined,
      reservedBy: [reserver(0)],
      alreadyOwnedBy: 0,
      excluded: false,
      mine: false,
    },
  ],
};

const ALERT =
  "return VXV_BossAlert and VXV_BossAlert.shown and { VXV_BossAlert.title.text, VXV_BossAlert.text.text } or false";
const kill = (encounterId: number, boss: string) =>
  `Fire("ENCOUNTER_START", ${String(encounterId)}, "${boss}", 9, 40) Fire("ENCOUNTER_END", ${String(encounterId)}, "${boss}", 9, 40, 1)`;

/** Thom Leboss with the evening's data (from his companion) and both raids' packs. */
function thom() {
  const started = startRaid({
    playerName: "Thom Leboss",
    written: companionFiles({ raid: websiteText(TWO_INSTANCES) }),
  });
  started.client(
    ONYXIA_PACK + HYJAL_PACK + "SoundsPlayed = {} function PlaySound(kit) table.insert(SoundsPlayed, kit) end",
  );
  return started;
}

describe("next boss", () => {
  it("is the first boss standing of the event's raids, and in an instance, that raid's", () => {
    const { raid } = thom();
    const find = `local _, ns = ... local found = ns.NextBoss.Find(ns.RaidData.Current(), ns.RaidLog.Current().kills)
      return found and { found.raid.name, found.boss and found.boss.name or false, found.fallen, found.here }`;
    expect(raid.run(find)).toEqual(["Repaire d'Onyxia", "Onyxia", 0, false]);
    raid.run(`Instance.id = 534`);
    expect(raid.run(find)).toEqual(["Mont Hyjal", "Rage Froidhiver", 0, true]);
  });

  it("shows its alert over VXV's window", () => {
    const { client } = thom();
    client('Instance.id = 249 AdvanceTime(5) SlashCmdList.VXV("")');
    expect(client(ALERT)).not.toBe(false);
    expect(drawnAbove(client("return VXV_BossAlert.strata"), client("return VXV_Window.strata"))).toBe(true);
  });

  it("alerts once on a raid chaining two instances, at each boss where the player has a soft reserve", () => {
    const { client, errors } = thom();
    client("AdvanceTime(5)");
    expect(client(ALERT)).toBe(false);
    // Onyxia's lair: the first boss holds the Tête d'Onyxia.
    client("Instance.id = 249 AdvanceTime(5)");
    expect(client(ALERT)).toEqual(["Tu as une SR sur le prochain boss", "Onyxia · Tête d'Onyxia · SR+ 20"]);
    expect(client("return SoundsPlayed")).toEqual([8959]);
    client("VXV_BossAlert:Hide() AdvanceTime(10)");
    expect(client(ALERT)).toBe(false);
    // The guardian next: nothing reserved there.
    client(kill(1084, "Onyxia"));
    client("AdvanceTime(5)");
    expect(client(ALERT)).toBe(false);
    client(kill(1085, "Gardienne"));
    // Mount Hyjal: Rage Froidhiver first, then Anetheron and its blade.
    client("Instance.id = 1 AdvanceTime(5) Instance.id = 534 AdvanceTime(5)");
    expect(client(ALERT)).toBe(false);
    client(kill(618, "Rage Froidhiver"));
    expect(client(ALERT)).toEqual(["Tu as une SR sur le prochain boss", "Anetheron · Lame d'Anetheron"]);
    expect(client("return SoundsPlayed")).toEqual([8959, 8959]);
    expect(errors()).toEqual([]);
  });

  it("stays silent once the player turned the alert off, and shows the next boss in the Raid screen", () => {
    const { client, raid } = thom();
    client('SlashCmdList.VXV("alerte")');
    expect(client("return Printed")).toContain(
      `${PREFIX}Alerte du prochain boss désactivée (/vxv alerte pour la remettre).`,
    );
    client("Instance.id = 249 AdvanceTime(5)");
    expect(client(ALERT)).toBe(false);
    const rows = raid.run(`local _, ns = ...
      local texts = {}
      for _, row in ipairs(ns.RaidView.NextBoss(ns.RaidData.Current(), "Thom Leboss")) do texts[#texts + 1] = row.text end
      return texts`);
    expect(rows).toEqual([
      "|cffe0479eProchain boss · Onyxia|r",
      "|cffc58bffTête d'Onyxia|r : |cffffffffThom Leboss|r (toi, +20)",
      "|cffc58bffSac en peau|r : |cfffff468Ðéjà Vu|r +10",
      "|cffc58bffÉcaille d'Onyxia|r · exclu des SR (loot council)",
      "|cffc58bffBâton du dragon|r · aucune SR (roll libre)",
    ]);
  });
});

describe("a player who joins the raid late", () => {
  it("learns the bosses already killed from the master looter, and the next boss follows", () => {
    const guild = raidWithData([OFFICER, "Aube Claire"]);
    for (const player of guild.players) {
      player.client(ONYXIA_PACK);
      player.client(kill(1084, "Onyxia"));
    }
    settle(guild);
    const late = guild.join("Thom Leboss");
    late.client(ONYXIA_PACK);
    settle(guild);
    late.client(
      `Group.members = { "${OFFICER}", "Aube Claire" } Group.raid = true MasterLooter = "${OFFICER}" Fire("GROUP_ROSTER_UPDATE")`,
    );
    settle(guild);
    const next = `local _, ns = ... return ns.NextBoss.Find(ns.RaidData.Current(), ns.RaidLog.Current().kills).boss.name`;
    expect(late.bundles.VXV_Raid?.run(next)).toBe("Gardienne");
    expect(late.errors()).toEqual([]);
  });
});
