import { fullName, type Character } from "./characters.ts";
import { LOOT_METHODS, type LootMethod } from "./history.ts";
import { instant, readRecords, requireRecord, wholeNumber } from "./textFormat.ts";

/** First line of a raid's record exported by the addon (contract with VXV_Raid); the number is the format version. */
export const RAID_LOG_HEADER = "VXV-LOG-2";
/** The versions still read: an addon not updated yet writes version 1, without the meter and the resurrections. */
const READ_HEADERS: readonly string[] = ["VXV-LOG-1", RAID_LOG_HEADER];

export interface RaidLog {
  eventId: string;
  startedAt: Date | undefined;
  endedAt: Date | undefined;
  kills: { encounterId: number; killedAt: Date }[];
  /** Characters present at the kills, as "Prénom Nom". */
  present: string[];
  loots: { encounterId: number; itemId: number; winner: string; method: LootMethod; lootedAt: Date }[];
  deaths: { name: string; count: number }[];
  /** The game's damage meter over the bosses killed (P13), by character. */
  meter: { name: string; damage: number; healing: number }[];
  /** The resurrections each character accepted during the raid (P13). */
  raised: { name: string; count: number }[];
}

function isLootMethod(value: string | undefined): value is LootMethod {
  return (LOOT_METHODS as readonly (string | undefined)[]).includes(value);
}

/**
 * Reads the record line by line, reporting every problem with its line number:
 * R;event id;start (Unix seconds);end, K;encounter id;time, P;character, L;encounter id;item id;winner;method;time,
 * D;character;deaths, and since version 2 M;character;damage;healing and A;character;resurrections accepted.
 * Lines of an unknown kind are skipped.
 */
export function parseRaidLog(text: string): RaidLog {
  let raid: Pick<RaidLog, "eventId" | "startedAt" | "endedAt"> | undefined;
  const log: Omit<RaidLog, "eventId" | "startedAt" | "endedAt"> = {
    kills: [],
    present: [],
    loots: [],
    deaths: [],
    meter: [],
    raised: [],
  };
  readRecords(text, {
    headers: READ_HEADERS,
    wrongHeader: `Le journal doit commencer par la ligne ${RAID_LOG_HEADER} : copiez-le depuis l'addon (onglet Butin).`,
    advice: "recopiez le journal depuis l'addon",
    readers: {
      R: ([eventId, startedAt, endedAt]) => {
        raid = eventId ? { eventId, startedAt: instant(startedAt), endedAt: instant(endedAt) } : undefined;
        return raid !== undefined;
      },
      K: ([encounterId, killedAt]) => {
        const encounter = wholeNumber(encounterId);
        const at = instant(killedAt);
        if (encounter === undefined || at === undefined) {
          return false;
        }
        log.kills.push({ encounterId: encounter, killedAt: at });
        return true;
      },
      P: ([name]) => {
        if (!name) {
          return false;
        }
        log.present.push(name);
        return true;
      },
      L: ([encounterId, itemId, winner, method, lootedAt]) => {
        const encounter = wholeNumber(encounterId);
        const item = wholeNumber(itemId);
        const at = instant(lootedAt);
        if (encounter === undefined || item === undefined || !winner || !isLootMethod(method) || at === undefined) {
          return false;
        }
        log.loots.push({ encounterId: encounter, itemId: item, winner, method, lootedAt: at });
        return true;
      },
      D: ([name, count]) => {
        const deaths = wholeNumber(count);
        if (!name || deaths === undefined) {
          return false;
        }
        log.deaths.push({ name, count: deaths });
        return true;
      },
      M: ([name, damage, healing]) => {
        const damageDone = wholeNumber(damage);
        const healingDone = wholeNumber(healing);
        if (!name || damageDone === undefined || healingDone === undefined) {
          return false;
        }
        log.meter.push({ name, damage: damageDone, healing: healingDone });
        return true;
      },
      A: ([name, count]) => {
        const accepted = wholeNumber(count);
        if (!name || accepted === undefined) {
          return false;
        }
        log.raised.push({ name, count: accepted });
        return true;
      },
    },
  });
  return { ...requireRecord(raid, "Le journal ne dit pas de quel événement il s'agit (ligne R manquante)."), ...log };
}

/** What an import adds: who was present, the gives, and what the website does not know. */
export interface RaidLogImportPlan {
  presentIds: string[];
  loots: { encounterId: number; itemId: number; characterId: string; method: LootMethod; lootedAt: Date }[];
  /** Characters unknown to the roster, as written in the log. */
  unknownCharacters: string[];
  /** Gives of a boss or an item that the event's raids do not have (trash, another raid). */
  unknownLoots: number;
}

/** Matches the log with the guild's characters and the event's raids. */
export function planRaidLogImport(
  log: RaidLog,
  context: {
    characters: readonly Character[];
    encounterIds: ReadonlySet<number>;
    itemIds: ReadonlySet<number>;
  },
): RaidLogImportPlan {
  const byName = new Map(context.characters.map((character) => [fullName(character), character.id]));
  const unknown = new Set<string>();
  const idOf = (name: string) => {
    const id = byName.get(name);
    if (id === undefined) {
      unknown.add(name);
    }
    return id;
  };
  const presentIds = [...new Set(log.present.map(idOf).filter((id): id is string => id !== undefined))];
  const plan: RaidLogImportPlan = { presentIds, loots: [], unknownCharacters: [], unknownLoots: 0 };
  for (const loot of log.loots) {
    const characterId = idOf(loot.winner);
    if (!context.encounterIds.has(loot.encounterId) || !context.itemIds.has(loot.itemId)) {
      plan.unknownLoots += 1;
    } else if (characterId !== undefined) {
      plan.loots.push({ ...loot, characterId });
    }
  }
  plan.unknownCharacters = [...unknown].sort();
  return plan;
}

/** Of two records of the same raid sent by different players, the one with more lines knows more of it. */
export function isMoreComplete(candidate: string, kept: string | undefined): boolean {
  const lines = (text: string) => text.split(/\r?\n/).filter((line) => line.trim() !== "").length;
  return kept === undefined || lines(candidate) >= lines(kept);
}
