/**
 * The game's combat log (Logs/WoWCombatLog-*.txt), written while the game runs (phase 0, T11): the addon switches it
 * on with its advanced mode in the raids. The companion reads it as it grows and keeps each boss killed with the
 * healing every player received, which the game's meter does not give: the website gives Princesse with it.
 */

/** First line of a boss killed, as the companion sends it (contract with packages/server/src/domain/bossFights.ts). */
export const BOSS_FIGHT_HEADER = "VXV-COMBAT-1";
/** The kind of the texts the companion sends for the bosses killed. */
export const BOSS_FIGHT_KIND = "combat";

const MS_PER_SECOND = 1000;
const FIELD_SEPARATOR = ";";
/** "10/7/2026 14:35:45.4302  EVENT,…": month, day, year and time on the player's clock, then the event. */
const LINE = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2})\.(\d+) {2}(.*)$/;
const MILLISECOND_DIGITS = 3;
const PLAYER_GUID = "Player-";
/** Positions among the event's fields: its source (GUID, name, flags, raid flags) then its target, as the latter. */
const DEST_GUID = 4;
const DEST_NAME = 5;
/** From the end of a heal in the advanced mode: amount, base amount, overhealing, absorbed, critical. */
const HEAL_AMOUNT_FROM_END = 5;
const OVERHEALING_FROM_END = 3;
const HEALS = new Set(["SPELL_HEAL", "SPELL_PERIODIC_HEAL"]);
const KILLED = "1";

/** A boss killed: when (Unix seconds), and the healing each player received during the fight, by their GUID. */
export interface BossFight {
  encounterId: number;
  name: string;
  difficulty: number;
  groupSize: number;
  startedAt: number;
  endedAt: number;
  /** The player's first name as the log writes it (the family name is not there), and the effective healing. */
  healingReceived: ReadonlyMap<string, { name: string; amount: number }>;
}

/** The fields of a line, separated by commas, the quoted ones unquoted. */
function fieldsOf(text: string): string[] {
  const fields: string[] = [];
  let current = "";
  let quoted = false;
  for (const character of text) {
    if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      fields.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  fields.push(current);
  return fields;
}

/** A line of the log: when it was written (Unix seconds, on the player's clock) and its event's fields. */
export function parseCombatLine(line: string): { at: number; event: string; fields: string[] } | undefined {
  const match = LINE.exec(line.trimEnd());
  if (match === null) {
    return undefined;
  }
  const [, month, day, year, hour, minute, second, fraction = "", rest = ""] = match;
  const at = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(fraction.slice(0, MILLISECOND_DIGITS).padEnd(MILLISECOND_DIGITS, "0")),
  );
  const [event = "", ...fields] = fieldsOf(rest);
  return { at: Math.floor(at.getTime() / MS_PER_SECOND), event, fields };
}

const wholeNumber = (value: string | undefined) => {
  const number = Number(value);
  return Number.isInteger(number) ? number : undefined;
};

/** A fight going on: the healing received so far, by player GUID. */
type OpenFight = Omit<BossFight, "endedAt" | "healingReceived"> & {
  healing: Map<string, { name: string; amount: number }>;
};

/** "Ðéjà-ClassicBetaPvP-" → "Ðéjà". */
const firstName = (name: string) => name.split("-")[0] ?? name;

/**
 * Reads the log line by line, from its start or from where the last reading stopped; read gives the boss killed when
 * the line ends its fight. Heals count only in the advanced mode, whose fields the addon switches on.
 */
export function createCombatLogReader() {
  let advanced = false;
  let fight: OpenFight | undefined;

  return {
    read(line: string): BossFight | undefined {
      const parsed = parseCombatLine(line);
      if (parsed === undefined) {
        return undefined;
      }
      const { at, event, fields } = parsed;
      if (event === "COMBAT_LOG_VERSION") {
        advanced = fields[2] === "1";
      } else if (event === "ENCOUNTER_START") {
        const [encounterId, name = "", difficulty, groupSize] = fields;
        const id = wholeNumber(encounterId);
        fight =
          id === undefined
            ? undefined
            : {
                encounterId: id,
                name,
                difficulty: wholeNumber(difficulty) ?? 0,
                groupSize: wholeNumber(groupSize) ?? 0,
                startedAt: at,
                healing: new Map(),
              };
      } else if (event === "ENCOUNTER_END") {
        const ended = fight;
        fight = undefined;
        if (ended !== undefined && wholeNumber(fields[0]) === ended.encounterId && fields[4] === KILLED) {
          const { healing, ...rest } = ended;
          return { ...rest, endedAt: at, healingReceived: healing };
        }
      } else if (fight !== undefined && advanced && HEALS.has(event)) {
        const guid = fields[DEST_GUID] ?? "";
        const amount = wholeNumber(fields.at(-HEAL_AMOUNT_FROM_END));
        const overhealing = wholeNumber(fields.at(-OVERHEALING_FROM_END));
        if (guid.startsWith(PLAYER_GUID) && amount !== undefined && overhealing !== undefined) {
          const known = fight.healing.get(guid);
          fight.healing.set(guid, {
            name: known?.name ?? firstName(fields[DEST_NAME] ?? ""),
            amount: (known?.amount ?? 0) + Math.max(0, amount - overhealing),
          });
        }
      }
      return undefined;
    },
  };
}

export type CombatLogReader = ReturnType<typeof createCombatLogReader>;

/** A boss killed's key: its encounter and when it ended, on the player's clock. */
export function bossFightKey(fight: BossFight): string {
  return `${String(fight.encounterId)}-${String(fight.endedAt)}`;
}

const field = (value: string) => value.replace(/[;\r\n]+/g, ", ");

/**
 * A boss killed for the website, one record per line:
 * F;encounter id;name;difficulty;group size;started (Unix seconds);ended (Unix seconds)
 * H;player GUID;first name;effective healing received (each healed player, the most healed first)
 */
export function formatBossFight(fight: BossFight): string {
  const heals = [...fight.healingReceived.entries()].sort(([, left], [, right]) => right.amount - left.amount);
  return [
    BOSS_FIGHT_HEADER,
    ["F", fight.encounterId, field(fight.name), fight.difficulty, fight.groupSize, fight.startedAt, fight.endedAt].join(
      FIELD_SEPARATOR,
    ),
    ...heals.map(([guid, { name, amount }]) => ["H", guid, field(name), amount].join(FIELD_SEPARATOR)),
  ].join("\n");
}
