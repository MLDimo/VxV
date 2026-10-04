import { fullName, type Character } from "./characters.ts";
import { LOOT_METHODS, type LootMethod } from "./history.ts";
import { TextFormatError } from "./textFormat.ts";

/** First line of a raid's record exported by the addon (contract with VXV_Raid); the number is the format version. */
export const RAID_LOG_HEADER = "VXV-LOG-1";

const MS_PER_SECOND = 1000;
const FIELD_SEPARATOR = ";";

export interface RaidLog {
  eventId: string;
  startedAt: Date | undefined;
  endedAt: Date | undefined;
  kills: { encounterId: number; killedAt: Date }[];
  /** Characters present at the kills, as "Prénom Nom". */
  present: string[];
  loots: { encounterId: number; itemId: number; winner: string; method: LootMethod; lootedAt: Date }[];
  deaths: { name: string; count: number }[];
}

export class RaidLogFormatError extends TextFormatError {}

function instant(value: string | undefined): Date | undefined {
  const seconds = Number(value);
  return value !== undefined && value !== "" && Number.isInteger(seconds)
    ? new Date(seconds * MS_PER_SECOND)
    : undefined;
}

function wholeNumber(value: string | undefined): number | undefined {
  const number = Number(value);
  return value !== undefined && value !== "" && Number.isInteger(number) && number >= 0 ? number : undefined;
}

function isLootMethod(value: string | undefined): value is LootMethod {
  return (LOOT_METHODS as readonly (string | undefined)[]).includes(value);
}

/**
 * Reads the record line by line, reporting every problem with its line number:
 * R;event id;start (Unix seconds);end, K;encounter id;time, P;character, L;encounter id;item id;winner;method;time,
 * D;character;deaths. Lines of an unknown kind are skipped.
 */
export function parseRaidLog(text: string): RaidLog {
  const lines = text
    .split(/\r?\n/)
    .map((content, index) => ({ number: index + 1, content: content.trim() }))
    .filter((line) => line.content !== "");
  const [header, ...rows] = lines;
  if (header?.content !== RAID_LOG_HEADER) {
    throw new RaidLogFormatError([
      `Le journal doit commencer par la ligne ${RAID_LOG_HEADER} : copiez-le depuis l'addon (onglet Butin).`,
    ]);
  }
  const log: RaidLog = {
    eventId: "",
    startedAt: undefined,
    endedAt: undefined,
    kills: [],
    present: [],
    loots: [],
    deaths: [],
  };
  const problems: string[] = [];
  const readers: Record<string, (fields: string[]) => boolean> = {
    R: ([, eventId, startedAt, endedAt]) => {
      log.eventId = eventId ?? "";
      log.startedAt = instant(startedAt);
      log.endedAt = instant(endedAt);
      return log.eventId !== "";
    },
    K: ([, encounterId, killedAt]) => {
      const encounter = wholeNumber(encounterId);
      const at = instant(killedAt);
      if (encounter === undefined || at === undefined) {
        return false;
      }
      log.kills.push({ encounterId: encounter, killedAt: at });
      return true;
    },
    P: ([, name]) => {
      if (!name) {
        return false;
      }
      log.present.push(name);
      return true;
    },
    L: ([, encounterId, itemId, winner, method, lootedAt]) => {
      const encounter = wholeNumber(encounterId);
      const item = wholeNumber(itemId);
      const at = instant(lootedAt);
      if (encounter === undefined || item === undefined || !winner || !isLootMethod(method) || at === undefined) {
        return false;
      }
      log.loots.push({ encounterId: encounter, itemId: item, winner, method, lootedAt: at });
      return true;
    },
    D: ([, name, count]) => {
      const deaths = wholeNumber(count);
      if (!name || deaths === undefined) {
        return false;
      }
      log.deaths.push({ name, count: deaths });
      return true;
    },
  };
  for (const row of rows) {
    const fields = row.content.split(FIELD_SEPARATOR).map((field) => field.trim());
    const read = readers[fields[0] ?? ""];
    if (read !== undefined && !read(fields)) {
      problems.push(`Ligne ${row.number} illisible : recopiez le journal depuis l'addon.`);
    }
  }
  if (problems.length === 0 && log.eventId === "") {
    problems.push("Le journal ne dit pas de quel événement il s'agit (ligne R manquante).");
  }
  if (problems.length > 0) {
    throw new RaidLogFormatError(problems);
  }
  return log;
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
