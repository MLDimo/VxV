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
});
