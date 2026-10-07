import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { diskGameFiles } from "./disk.ts";

describe("game files on the disk", () => {
  let game: string;

  beforeEach(async () => {
    game = await mkdtemp(join(tmpdir(), "vxv-game-"));
  });

  afterEach(async () => {
    await rm(game, { recursive: true, force: true });
  });

  it("writes the inbox into the VXV_Sync bundle of the game", async () => {
    const bundle = join(game, "Interface", "AddOns", "VXV_Sync");
    await mkdir(join(bundle, "External"), { recursive: true });
    await writeFile(join(bundle, "VXV_Sync.toc"), "## Title: VXV Sync");
    expect(await diskGameFiles.writeInbox(game, "ns.Inbox = {}")).toBe(true);
    expect(await readFile(join(bundle, "External", "Inbox.lua"), "utf8")).toBe("ns.Inbox = {}");
  });

  it("writes nothing for an addon without VXV_Sync", async () => {
    expect(await diskGameFiles.writeInbox(game, "ns.Inbox = {}")).toBe(false);
    await expect(readFile(join(game, "Interface", "AddOns", "VXV_Sync", "External", "Inbox.lua"))).rejects.toThrow();
  });

  it("finds the combat logs of the game and reads them from where the last reading stopped", async () => {
    const logs = join(game, "Logs");
    await mkdir(logs, { recursive: true });
    await writeFile(join(logs, "WoWCombatLog-100726_210000.txt"), "ligne 1\nligne 2\n");
    await writeFile(join(logs, "Client.log"), "autre journal");
    expect(await diskGameFiles.combatLogs(game)).toEqual([
      { path: join(logs, "WoWCombatLog-100726_210000.txt"), size: 16, modifiedAt: expect.any(Number) },
    ]);
    const bytes = await diskGameFiles.readRange(join(logs, "WoWCombatLog-100726_210000.txt"), 8, 100);
    expect(new TextDecoder().decode(bytes)).toBe("ligne 2\n");
    expect(await diskGameFiles.combatLogs(join(game, "ailleurs"))).toEqual([]);
  });

  it("finds VXV_Sync's saved data of every account, and reads them", async () => {
    const saved = join(game, "WTF", "Account", "124804161#1", "SavedVariables");
    await mkdir(saved, { recursive: true });
    await mkdir(join(game, "WTF", "Account", "SANS_VXV", "SavedVariables"), { recursive: true });
    await writeFile(join(saved, "VXV_Sync.lua"), "VXV_SyncDB = {}");
    const files = await diskGameFiles.savedFiles(game);
    expect(files).toEqual([{ path: join(saved, "VXV_Sync.lua"), modifiedAt: expect.any(Number) }]);
    expect(new TextDecoder().decode(await diskGameFiles.read(join(saved, "VXV_Sync.lua")))).toBe("VXV_SyncDB = {}");
    expect(await diskGameFiles.savedFiles(join(game, "ailleurs"))).toEqual([]);
  });
});
