import type { RaidLog } from "./raidLog.ts";
import { instant, readRecords, requireRecord, wholeNumber } from "./textFormat.ts";

/**
 * The bosses killed as the companions read them in the game's combat log (phase 0, T11): the healing each player
 * received, which the game's meter does not give (Princesse). Each raider's companion sends its own record of a fight.
 */

/** First line of a boss killed (contract with apps/companion/src/domain/combatLog.ts); the version follows. */
export const BOSS_FIGHT_HEADER = "VXV-COMBAT-1";

/** Two records tell the same fight when they end this close: the players' clocks differ. */
export const SAME_FIGHT_MS = 5 * 60 * 1000;

export interface BossFight {
  encounterId: number;
  name: string;
  difficulty: number;
  groupSize: number;
  startedAt: Date;
  endedAt: Date;
  /** The combat log names a player by first name only; their GUID tells them apart. */
  healingReceived: { guid: string; firstName: string; amount: number }[];
}

/**
 * Reads a boss killed, one record per line:
 * F;encounter id;name;difficulty;group size;started (Unix seconds);ended (Unix seconds)
 * H;player GUID;first name;effective healing received
 */
export function parseBossFight(text: string): BossFight {
  let fight: Omit<BossFight, "healingReceived"> | undefined;
  const healingReceived: BossFight["healingReceived"] = [];
  readRecords(text, {
    headers: [BOSS_FIGHT_HEADER],
    wrongHeader: `Un combat doit commencer par la ligne ${BOSS_FIGHT_HEADER}.`,
    readers: {
      F: ([encounterId, name, difficulty, groupSize, startedAt, endedAt]) => {
        const id = wholeNumber(encounterId);
        const level = wholeNumber(difficulty);
        const size = wholeNumber(groupSize);
        const started = instant(startedAt);
        const ended = instant(endedAt);
        if (!id || !name || level === undefined || size === undefined || !started || !ended) {
          return false;
        }
        fight = { encounterId: id, name, difficulty: level, groupSize: size, startedAt: started, endedAt: ended };
        return true;
      },
      H: ([guid, firstName, amount]) => {
        const healing = wholeNumber(amount);
        if (!guid || !firstName || healing === undefined) {
          return false;
        }
        healingReceived.push({ guid, firstName, amount: healing });
        return true;
      },
    },
  });
  return { ...requireRecord(fight, "Le combat ne dit pas quel boss est tombé (ligne F manquante)."), healingReceived };
}

/** The healing a record of a fight holds: of two records of the same fight, the more complete is kept. */
export function totalHealing(fight: Pick<BossFight, "healingReceived">): number {
  return fight.healingReceived.reduce((total, heal) => total + heal.amount, 0);
}

/** Whether two records (a companion's, a raid log's kill) tell the same fight: the same boss, ended close. */
export function isSameFight(
  left: { encounterId: number; endedAt: Date },
  right: { encounterId: number; endedAt: Date },
): boolean {
  return (
    left.encounterId === right.encounterId &&
    Math.abs(left.endedAt.getTime() - right.endedAt.getTime()) <= SAME_FIGHT_MS
  );
}

/**
 * The healing each player present received on the raid's bosses killed, from the fights the companions read: a
 * player is found by first name among the present ("Prénom Nom"), and left aside when two present share it.
 */
export function healingReceivedInRaid(
  log: Pick<RaidLog, "kills" | "present">,
  fights: readonly BossFight[],
): { name: string; amount: number }[] {
  const byFirstName = new Map<string, string | undefined>();
  for (const name of log.present) {
    const first = name.split(" ")[0] ?? name;
    byFirstName.set(first, byFirstName.has(first) ? undefined : name);
  }
  return log.kills.flatMap((kill) => {
    const fight = fights.find((candidate) =>
      isSameFight(candidate, { encounterId: kill.encounterId, endedAt: kill.killedAt }),
    );
    return (fight?.healingReceived ?? []).flatMap(({ firstName, amount }) => {
      const name = byFirstName.get(firstName);
      return name === undefined ? [] : [{ name, amount }];
    });
  });
}
