import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSettingsFile, createTokenFile, DEFAULT_SETTINGS, type Cipher } from "./storage.ts";

/** Stands for the system's encryption: reversible, and visibly not the plain text. */
const cipher: Cipher = {
  isEncryptionAvailable: () => true,
  encryptString: (text) => Buffer.from([...text].reverse().join("")),
  decryptString: (data) => [...data.toString()].reverse().join(""),
};

describe("companion storage", () => {
  let folder: string;

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), "vxv-companion-"));
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it("gives the default settings without file, or with a damaged one", async () => {
    const settings = createSettingsFile(join(folder, "settings.json"));
    expect(await settings.read()).toEqual(DEFAULT_SETTINGS);
    await writeFile(join(folder, "settings.json"), "{ damaged");
    expect(await settings.read()).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps the player's settings", async () => {
    const settings = createSettingsFile(join(folder, "deep", "settings.json"));
    await settings.write({ gameFolder: "D:\\Jeux\\World of Warcraft", launchAtLogin: false });
    expect(await settings.read()).toEqual({ gameFolder: "D:\\Jeux\\World of Warcraft", launchAtLogin: false });
  });

  it("keeps the token encrypted, and forgets it", async () => {
    const tokens = createTokenFile(join(folder, "token"), cipher);
    expect(await tokens.read()).toBeUndefined();
    await tokens.write("secret-token");
    expect(await readFile(join(folder, "token"), "utf8")).not.toContain("secret-token");
    expect(await tokens.read()).toBe("secret-token");
    await tokens.clear();
    expect(await tokens.read()).toBeUndefined();
  });

  it("never writes the token in clear when the system cannot encrypt", async () => {
    const tokens = createTokenFile(join(folder, "token"), { ...cipher, isEncryptionAvailable: () => false });
    await tokens.write("secret-token");
    await expect(readFile(join(folder, "token"))).rejects.toThrow();
  });
});
