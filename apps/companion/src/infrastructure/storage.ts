import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Settings, SettingsStore, TokenStore } from "../application/ports.ts";

export const DEFAULT_SETTINGS: Settings = { gameFolder: undefined, launchAtLogin: true };

/** Written beside, then put in place: a crash never leaves half a file. */
export async function writeAtomically(path: string, data: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(`${path}.tmp`, data);
  await rename(`${path}.tmp`, path);
}

/** Settings in a JSON file; a missing or damaged file gives the defaults. */
export function createSettingsFile(path: string): SettingsStore {
  return {
    async read(): Promise<Settings> {
      const saved = (await readFile(path, "utf8")
        .then((text) => JSON.parse(text) as unknown)
        .catch(() => undefined)) as Partial<Record<keyof Settings, unknown>> | undefined;
      return {
        gameFolder: typeof saved?.gameFolder === "string" ? saved.gameFolder : DEFAULT_SETTINGS.gameFolder,
        launchAtLogin: typeof saved?.launchAtLogin === "boolean" ? saved.launchAtLogin : DEFAULT_SETTINGS.launchAtLogin,
      };
    },

    write(settings: Settings): Promise<void> {
      return writeAtomically(path, JSON.stringify(settings, null, 2));
    },
  };
}

/** Encryption by the system (Electron's safeStorage: the keychain on Mac, DPAPI on Windows). */
export interface Cipher {
  isEncryptionAvailable(): boolean;
  encryptString(text: string): Buffer;
  decryptString(data: Buffer): string;
}

/** The companion's token, encrypted on disk; without encryption it is kept for this launch only. */
export function createTokenFile(path: string, cipher: Cipher): TokenStore {
  return {
    async read(): Promise<string | undefined> {
      if (!cipher.isEncryptionAvailable()) {
        return undefined;
      }
      try {
        return cipher.decryptString(await readFile(path));
      } catch {
        return undefined;
      }
    },

    async write(token: string): Promise<void> {
      if (cipher.isEncryptionAvailable()) {
        await writeAtomically(path, cipher.encryptString(token));
      }
    },

    clear(): Promise<void> {
      return rm(path, { force: true });
    },
  };
}
