import { formatAddonEvent, type AddonEventFacts } from "@vxv/server/domain/addonExport";
import type { Signup } from "@vxv/server/domain/signups";
import type { BoardItem } from "@vxv/server/domain/softReserves";
import { startCore, type CoreStart } from "../core.ts";

function signup(characterId: string, characterName: string, characterClass: string, extra: Partial<Signup>): Signup {
  return {
    eventId: "e1",
    memberId: `m-${characterId}`,
    characterId,
    characterName,
    characterClass,
    role: "dps",
    spec: "Combat",
    status: "present",
    ...extra,
  };
}

function item(itemId: number, name: string, extra: Partial<BoardItem>): BoardItem {
  return {
    itemId,
    name,
    raidName: "Onyxia",
    bossName: "Onyxia",
    reservedBy: [],
    alreadyOwnedBy: 0,
    excluded: false,
    mine: false,
    ...extra,
  };
}

const reserver = (characterId: string, characterName: string, characterClass: string, bonus: number) => ({
  characterId,
  characterName,
  characterClass,
  bonus,
});

/** An Onyxia night as the website knows it: Ðéjà Vu is an officer, Ciel Gris comes with a reroll. */
export const ONYXIA_NIGHT: AddonEventFacts = {
  event: {
    id: "e1",
    startsAt: new Date("2026-12-10T20:00:00Z"),
    softReservesPerPlayer: 2,
    raids: [{ id: "onyxia", name: "Onyxia" }],
    discordMessageId: undefined,
  },
  signups: [
    signup("c-ciel", "Ciel Gris", "WARRIOR", { role: "tank", spec: "Protection", status: "bench" }),
    signup("c-thom", "Thom Leboss", "PRIEST", { role: "healer", spec: "Sacré", status: "late" }),
    signup("c-deja", "Ðéjà Vu", "ROGUE", {}),
  ],
  board: [
    item(10, "Cape de la gardienne", { bossName: "Gardienne" }),
    item(20, "Tête d'Onyxia", {
      reservedBy: [reserver("c-ciel", "Ciel Gris", "WARRIOR", 0), reserver("c-thom", "Thom Leboss", "PRIEST", 20)],
    }),
    item(21, "Sac en peau", { reservedBy: [reserver("c-deja", "Ðéjà Vu", "ROGUE", 10)] }),
    item(30, "Écaille d'Onyxia", { excluded: true }),
  ],
  officers: [
    {
      id: "c-deja",
      firstName: "Ðéjà",
      lastName: "Vu",
      characterClass: "ROGUE",
      memberId: "m-deja",
      isMain: true,
      inGuild: true,
    },
  ],
  mainCharacterIds: new Set(["c-thom", "c-deja"]),
  journal: [
    {
      id: "7",
      occurredAt: new Date("2026-12-09T18:00:00Z"),
      actorName: "Officier",
      action: "exclusion.add",
      entity: "exclusion",
      entityId: "e1/30",
      before: null,
      after: {
        itemName: "Écaille d'Onyxia",
        raids: ["Onyxia"],
        eventStartsAt: "2026-12-10T20:00:00.000Z",
        removedSoftReserves: [],
      },
      reason: "Pour le tank principal",
    },
  ],
  changes: [],
  exportedAt: new Date("2026-12-10T19:45:00Z"),
};

/** The raid of the tests' event as its data pack registers it: Onyxia, then the guardian. */
export const ONYXIA_PACK = `
  VXV_RaidData = { onyxia = { name = "Repaire d'Onyxia", instanceId = 249, bosses = {
      { encounterId = 1084, name = "Onyxia", loot = {
          { itemId = 20, name = "Tête d'Onyxia" }, { itemId = 21, name = "Sac en peau" },
          { itemId = 30, name = "Écaille d'Onyxia" }, { itemId = 40, name = "Bâton du dragon" } } },
      { encounterId = 1085, name = "Gardienne", loot = { { itemId = 10, name = "Cape de la gardienne" } } },
  } } }
`;
/** The text an officer copies from the website's event page. */
export function websiteText(facts: AddonEventFacts = ONYXIA_NIGHT): string {
  return formatAddonEvent(facts);
}

/** Pastes the text in the window of /vxv importer and clicks Charger. */
export function importText(client: (code: string) => unknown, text: string): void {
  client('SlashCmdList.VXV("importer")');
  client(`VXV_TextWindow.editBox:SetText(${JSON.stringify(text)}) VXV_TextWindow.button:Run("OnClick")`);
}

/** VXV_Core and VXV_Raid on a mocked client, as the game loads them; VXV_Sync too when the companion wrote files. */
export function startRaid(options: CoreStart = {}) {
  const bundles = options.written === undefined ? ["VXV_Raid"] : ["VXV_Raid", "VXV_Sync"];
  const started = startCore({ ...options, bundles });
  const raid = started.bundles.VXV_Raid;
  if (raid === undefined) {
    throw new Error("VXV_Raid was not loaded");
  }
  return {
    ...started,
    raid,
    importText: (text: string) => {
      importText(started.client, text);
    },
  };
}
