import type { LuaData } from "@vxv/lua";

/** Where the game saves what the addon's Sync part keeps for the website, for each account of a version of the game. */
export const ACCOUNTS_FOLDER = ["WTF", "Account"];
export const OUTBOX_FILE = ["SavedVariables", "VXV.lua"];
const OUTBOX_VARIABLE = "VXV_SyncDB";

/** Format of the outbox written by addon/VXV/Sync/Outbox.lua: a newer one asks for the companion's update. */
const OUTBOX_VERSION = 1;

/** A character of the player as the game draws it. */
export interface CharacterLook {
  name: string;
  race: string;
  sex: number;
}

/** What the addon saved for the website (contract with addon/VXV/Sync/Outbox.lua). */
export interface Outbox {
  /** The guild's roster as VXV-ROSTER text, and when the addon read it (Unix seconds). */
  roster: { text: string; capturedAt: number } | undefined;
  /** Records of raids as VXV-LOG text. */
  raidLogs: string[];
  characters: CharacterLook[];
  /** Changes made in game (addon/VXV/Raid/Changes.lua), as the website checks them: { id, kind, … }. */
  changes: { id: string; [field: string]: unknown }[];
  /** The game counters the addon read (P12.4), the latest of each character and counter. */
  counters: CounterReading[];
  /** Each bundle's texts for the website, by kind then key ("metiers" → "Prénom Nom" → VXV-METIERS text). */
  texts: Texts;
}

export type Texts = Readonly<Record<string, Readonly<Record<string, string>>>>;

/** A character's game counter as the addon read it, at an instant (Unix seconds). */
export interface CounterReading {
  name: string;
  type: string;
  value: number;
  at: number;
}

type OutboxReading = { kind: "read"; outbox: Outbox } | { kind: "newer" } | { kind: "none" };

const EMPTY: Outbox = { roster: undefined, raidLogs: [], characters: [], changes: [], counters: [], texts: {} };

function isTable(value: LuaData | undefined): value is { readonly [key: string]: LuaData } {
  return typeof value === "object";
}

/** A table of the saved data as JSON: a list keyed "1", "2"… becomes an array, and so does an empty table. */
function toJson(value: LuaData): unknown {
  if (typeof value !== "object") {
    return value;
  }
  const entries = Object.entries(value);
  const isList = entries.every(([key], index) => key === String(index + 1));
  return isList
    ? entries.map(([, item]) => toJson(item))
    : Object.fromEntries(entries.map(([key, item]) => [key, toJson(item)]));
}

/** The outbox in the variables of the saved file; values of another type are left aside. */
export function readOutbox(variables: Record<string, LuaData>): OutboxReading {
  const saved = variables[OUTBOX_VARIABLE];
  if (!isTable(saved)) {
    return { kind: "none" };
  }
  if (typeof saved.version === "number" && saved.version > OUTBOX_VERSION) {
    return { kind: "newer" };
  }
  const { roster, raidLogs, characters, changes, counters, texts } = saved;
  return {
    kind: "read",
    outbox: {
      roster:
        isTable(roster) && typeof roster.text === "string" && typeof roster.capturedAt === "number"
          ? { text: roster.text, capturedAt: roster.capturedAt }
          : undefined,
      raidLogs: isTable(raidLogs)
        ? Object.values(raidLogs).filter((log): log is string => typeof log === "string")
        : [],
      characters: isTable(characters)
        ? Object.entries(characters).flatMap(([name, look]) =>
            isTable(look) && typeof look.race === "string" && typeof look.sex === "number"
              ? [{ name, race: look.race, sex: look.sex }]
              : [],
          )
        : [],
      changes: isTable(changes)
        ? Object.values(changes).flatMap((change) =>
            isTable(change) && typeof change.id === "string" ? [{ ...(toJson(change) as object), id: change.id }] : [],
          )
        : [],
      counters: isTable(counters)
        ? Object.values(counters).flatMap((reading) =>
            isTable(reading) &&
            typeof reading.name === "string" &&
            typeof reading.type === "string" &&
            typeof reading.value === "number" &&
            typeof reading.at === "number"
              ? [{ name: reading.name, type: reading.type, value: reading.value, at: reading.at }]
              : [],
          )
        : [],
      texts: isTable(texts)
        ? Object.fromEntries(
            Object.entries(texts).flatMap(([kind, byKey]) =>
              isTable(byKey)
                ? [
                    [
                      kind,
                      Object.fromEntries(
                        Object.entries(byKey).filter(
                          (entry): entry is [string, string] => typeof entry[1] === "string",
                        ),
                      ),
                    ],
                  ]
                : [],
            ),
          )
        : {},
    },
  };
}

/** Each kind's texts of both, the second's winning for a key both have. */
function mergeTexts(first: Texts, second: Texts): Texts {
  const kinds = new Set([...Object.keys(first), ...Object.keys(second)]);
  return Object.fromEntries([...kinds].map((kind) => [kind, { ...first[kind], ...second[kind] }]));
}

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const HEX = 16;

/** A short fingerprint of a text (FNV-1a, 32 bits): remembers a text sent without keeping the whole text. */
export function textDigest(text: string): string {
  let hash = FNV_OFFSET;
  for (const unit of new TextEncoder().encode(text)) {
    hash = Math.imul(hash ^ unit, FNV_PRIME) >>> 0;
  }
  return hash.toString(HEX);
}

/** The outboxes of several accounts, as one: the latest roster, every raid's record and character. */
export function mergeOutboxes(outboxes: readonly Outbox[]): Outbox {
  return outboxes.reduce(
    (merged, outbox) => ({
      roster:
        outbox.roster !== undefined &&
        (merged.roster === undefined || outbox.roster.capturedAt > merged.roster.capturedAt)
          ? outbox.roster
          : merged.roster,
      raidLogs: [...merged.raidLogs, ...outbox.raidLogs.filter((log) => !merged.raidLogs.includes(log))],
      characters: [...merged.characters, ...outbox.characters],
      changes: [...merged.changes, ...outbox.changes],
      counters: [...merged.counters, ...outbox.counters],
      texts: mergeTexts(merged.texts, outbox.texts),
    }),
    EMPTY,
  );
}
