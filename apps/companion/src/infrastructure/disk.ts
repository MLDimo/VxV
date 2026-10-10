import { open, readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { GameFiles } from "../application/ports.ts";
import { INBOX_FILE } from "../domain/inbox.ts";
import { ACCOUNTS_FOLDER, OUTBOX_FILE } from "../domain/outbox.ts";
import { ADDON_TOC, type Computer, type FolderReader } from "../domain/installations.ts";
import { exists, writeAtomically } from "./files.ts";

const DRIVE_LETTERS = "CDEFGHIJKLMNOPQRSTUVWXYZ";
const LOGS_FOLDER = "Logs";
const COMBAT_LOG = /^WoWCombatLog.*\.txt$/;
const MAC_VOLUMES = "/Volumes";

/** The real disk; folders that cannot be read count as empty. */
export const diskReader: FolderReader = {
  join,
  exists,
  async subfolders(path) {
    const entries = await readdir(path, { withFileTypes: true }).catch(() => []);
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  },
};

/** This computer: its platform, the player's home, and its drives (Windows) or volumes (Mac). */
export async function thisComputer(): Promise<Computer> {
  const platform = process.platform;
  let roots: string[] = [];
  if (platform === "win32") {
    const drives = [...DRIVE_LETTERS].map((letter) => `${letter}:\\`);
    roots = (await Promise.all(drives.map(async (drive) => ((await exists(drive)) ? drive : undefined)))).filter(
      (drive): drive is string => drive !== undefined,
    );
  } else if (platform === "darwin") {
    roots = (await diskReader.subfolders(MAC_VOLUMES)).map((volume) => join(MAC_VOLUMES, volume));
  }
  return { platform, home: homedir(), roots };
}

/** The game's files on the real disk. */
export const diskGameFiles: GameFiles = {
  async writeInbox(installation, content) {
    if (!(await exists(join(installation, ...ADDON_TOC)))) {
      return false;
    }
    await writeAtomically(join(installation, ...INBOX_FILE), content);
    return true;
  },

  async savedFiles(installation) {
    const accounts = join(installation, ...ACCOUNTS_FOLDER);
    const files = await Promise.all(
      (await diskReader.subfolders(accounts)).map(async (account) => {
        const path = join(accounts, account, ...OUTBOX_FILE);
        const saved = await stat(path).catch(() => undefined);
        return saved?.isFile() ? [{ path, modifiedAt: saved.mtimeMs }] : [];
      }),
    );
    return files.flat();
  },

  async read(path) {
    return new Uint8Array(await readFile(path));
  },

  async combatLogs(installation) {
    const folder = join(installation, LOGS_FOLDER);
    const names = (await readdir(folder).catch(() => [])).filter((name) => COMBAT_LOG.test(name));
    const logs = await Promise.all(
      names.map(async (name) => {
        const path = join(folder, name);
        const log = await stat(path).catch(() => undefined);
        return log?.isFile() ? [{ path, size: log.size, modifiedAt: log.mtimeMs }] : [];
      }),
    );
    return logs.flat();
  },

  async readRange(path, start, length) {
    const file = await open(path, "r");
    try {
      const buffer = new Uint8Array(length);
      const { bytesRead } = await file.read(buffer, 0, length, start);
      return buffer.subarray(0, bytesRead);
    } finally {
      await file.close();
    }
  },
};
