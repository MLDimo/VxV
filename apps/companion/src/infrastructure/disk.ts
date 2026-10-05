import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { GameFiles } from "../application/ports.ts";
import { INBOX_FILE, SYNC_BUNDLE } from "../domain/inbox.ts";
import { ACCOUNTS_FOLDER, OUTBOX_FILE } from "../domain/outbox.ts";
import type { Computer, FolderReader } from "../domain/installations.ts";
import { exists, writeAtomically } from "./files.ts";

const DRIVE_LETTERS = "CDEFGHIJKLMNOPQRSTUVWXYZ";
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
    const bundle = join(installation, ...SYNC_BUNDLE);
    if (!(await exists(join(bundle, "VXV_Sync.toc")))) {
      return false;
    }
    await writeAtomically(join(bundle, ...INBOX_FILE), content);
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
};
