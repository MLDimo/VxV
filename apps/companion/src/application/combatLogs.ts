import { bossFightKey, createCombatLogReader, formatBossFight, type CombatLogReader } from "../domain/combatLog.ts";
import type { GameFiles, LogFile } from "./ports.ts";

/** At launch, a combat log the game wrote this recently is read from its start; an older one is left aside. */
export const RECENT_LOG_MS = 12 * 60 * 60 * 1000;
/** Read this much at a time: a raid's log weighs tens of megabytes. */
const CHUNK_BYTES = 4 * 1024 * 1024;
const NEWLINE = 0x0a;

/** The game's combat logs, read as they grow: each boss killed once, as its text for the website. */
export function createCombatLogs(gameFiles: Pick<GameFiles, "combatLogs" | "readRange">) {
  /** Where the reading of each log stopped, after its last whole line. */
  const files = new Map<string, { offset: number; reader: CombatLogReader }>();
  const decoder = new TextDecoder();

  async function readNew(
    log: LogFile,
    file: { offset: number; reader: CombatLogReader },
    fights: Record<string, string>,
  ) {
    while (file.offset < log.size) {
      const bytes = await gameFiles.readRange(log.path, file.offset, Math.min(CHUNK_BYTES, log.size - file.offset));
      const end = bytes.lastIndexOf(NEWLINE);
      if (end < 0) {
        return;
      }
      for (const line of decoder.decode(bytes.subarray(0, end)).split("\n")) {
        const fight = file.reader.read(line);
        if (fight !== undefined) {
          fights[bossFightKey(fight)] = formatBossFight(fight);
        }
      }
      file.offset += end + 1;
    }
  }

  return {
    /** The bosses killed in the logs since the last reading, as VXV-COMBAT texts by key. */
    async newFights(installations: readonly string[], now: Date): Promise<Record<string, string>> {
      const fights: Record<string, string> = {};
      for (const installation of installations) {
        for (const log of await gameFiles.combatLogs(installation)) {
          let file = files.get(log.path);
          if (file === undefined || log.size < file.offset) {
            const fromStart = file !== undefined || now.getTime() - log.modifiedAt < RECENT_LOG_MS;
            file = { offset: fromStart ? 0 : log.size, reader: createCombatLogReader() };
            files.set(log.path, file);
          }
          await readNew(log, file, fights);
        }
      }
      return fights;
    },
  };
}
