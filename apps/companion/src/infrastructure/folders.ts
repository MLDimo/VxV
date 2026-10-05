import { access, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Computer, FolderReader } from "../domain/installations.ts";

const DRIVE_LETTERS = "CDEFGHIJKLMNOPQRSTUVWXYZ";
const MAC_VOLUMES = "/Volumes";

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

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
