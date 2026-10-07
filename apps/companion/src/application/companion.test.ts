import { posix } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FolderReader } from "../domain/installations.ts";
import {
  createCompanion,
  SYNC_EVERY_MS,
  WATCH_EVERY_MS,
  type Companion,
  type CompanionDependencies,
} from "./companion.ts";
import { SiteError, UnlinkedError } from "./errors.ts";
import type { Settings, SitePort } from "./ports.ts";

const member = { name: "Martin", roles: ["member", "officer"] };
const NEXT_RAID = {
  text: "VXV-RAID-2\nE;e1;1796932800;1796931900;2;Onyxia",
  title: "Onyxia",
  startsAt: "2026-12-10T20:00:00.000Z",
};
const NOW = new Date("2026-12-10T19:45:00Z");
/** VXV_Sync's saved data, as the game writes them. */
const SAVED_DATA = [
  "VXV_SyncDB = {",
  '\t["version"] = 1,',
  '\t["roster"] = { ["text"] = "VXV-ROSTER-1\\nÐéjà;Vu;ROGUE", ["capturedAt"] = 1796904000 },',
  '\t["raidLogs"] = {',
  '\t\t["e1"] = "VXV-LOG-1\\nR;e1;1796904000;1796904120",',
  "\t},",
  '\t["characters"] = { ["Ðéjà Vu"] = { ["race"] = "Scourge", ["sex"] = 3 } },',
  "}",
].join("\n");
const started: Companion[] = [];
const TOC = "Interface/AddOns/VXV_Core/VXV_Core.toc";

/** A Mac whose disk holds these files. */
function disk(...files: string[]): FolderReader {
  return {
    join: posix.join,
    exists: async (path) => files.some((file) => file === path || file.startsWith(`${path}/`)),
    subfolders: async (path) => [
      ...new Set(
        files
          .filter((file) => file.startsWith(`${path}/`))
          .map((file) => file.slice(path.length + 1).split("/")[0] ?? ""),
      ),
    ],
  };
}

function setUp(overrides: Partial<CompanionDependencies> = {}, savedToken?: string) {
  let saved: Settings = { gameFolder: undefined, launchAtLogin: true };
  let token = savedToken;
  const inboxes = new Map<string, string>();
  /** VXV_Sync's saved data, by file: its Lua text, and when the game wrote it. */
  const savedData = new Map<string, { text: string; modifiedAt: number }>();
  /** The game's combat logs, by file. */
  const combatLogs = new Map<string, Uint8Array>();
  const site: SitePort = {
    linkPage: ({ state }) => `https://vxv.example/compagnon/relier?etat=${state}`,
    exchange: vi.fn(async () => ({ token: "new-token", member })),
    me: vi.fn(async () => member),
    unlink: vi.fn(async () => undefined),
    download: vi.fn(async () => ({ raid: NEXT_RAID })),
    upload: vi.fn(async (_token, upload) => ({
      ...(upload.roster === undefined ? {} : { roster: "Liste de guilde à jour." }),
      raidLogs: upload.raidLogs.map(() => "Journal du raid importé."),
      characters: upload.characters.length,
      ...(upload.changes.length === 0 ? {} : { changes: `${String(upload.changes.length)} changement fait en jeu.` }),
    })),
  };
  const dependencies: CompanionDependencies = {
    site,
    tokens: {
      read: async () => token,
      write: async (value) => {
        token = value;
      },
      clear: async () => {
        token = undefined;
      },
    },
    settings: {
      read: async () => saved,
      write: async (value) => {
        saved = value;
      },
    },
    folders: disk(`/Applications/World of Warcraft/_classic_/${TOC}`),
    gameFiles: {
      writeInbox: async (installation, content) => {
        inboxes.set(installation, content);
        return true;
      },
      savedFiles: async () => [...savedData].map(([path, { modifiedAt }]) => ({ path, modifiedAt })),
      read: async (path) => new TextEncoder().encode(savedData.get(path)?.text ?? ""),
      combatLogs: async () =>
        [...combatLogs].map(([path, text]) => ({ path, size: text.length, modifiedAt: NOW.getTime() })),
      readRange: async (path, start, length) =>
        (combatLogs.get(path) ?? new Uint8Array()).subarray(start, start + length),
    },
    clock: () => NOW,
    computer: async () => ({ platform: "darwin", home: "/Users/martin", roots: [] }),
    // The member never comes back from the browser.
    listen: async () => ({ port: 1, returned: new Promise(() => undefined), close: () => undefined }),
    openBrowser: async () => undefined,
    applyLaunchAtLogin: vi.fn(),
    version: "1.0.0",
    ...overrides,
  };
  const companion = createCompanion(dependencies);
  started.push(companion);
  return { companion, dependencies, site, inboxes, savedData, combatLogs, token: () => token, saved: () => saved };
}

afterEach(() => {
  for (const companion of started.splice(0)) {
    companion.stop();
  }
  vi.useRealTimers();
});

describe("companion", () => {
  it("starts with the game found and the member of the saved token", async () => {
    const { companion, dependencies } = setUp({}, "saved-token");
    await companion.start();
    expect(companion.state()).toMatchObject({
      account: member,
      installations: ["/Applications/World of Warcraft/_classic_"],
    });
    expect(dependencies.applyLaunchAtLogin).toHaveBeenCalledWith(true);
  });

  it("forgets a token the website no longer accepts", async () => {
    const { companion, site, token } = setUp({}, "old-token");
    vi.mocked(site.me).mockRejectedValue(new UnlinkedError());
    await companion.start();
    expect(companion.state().account).toBeUndefined();
    expect(companion.state().notice).toContain("relie-le de nouveau");
    expect(token()).toBeUndefined();
  });

  it("keeps the token when the website is out of reach", async () => {
    const { companion, site, token } = setUp({}, "saved-token");
    vi.mocked(site.me).mockRejectedValue(new SiteError("Le site VXV ne répond pas."));
    vi.mocked(site.download).mockRejectedValue(new SiteError("Le site VXV ne répond pas."));
    await companion.start();
    expect(companion.state().notice).toBe("Le site VXV ne répond pas.");
    expect(token()).toBe("saved-token");
  });

  it("links the account through the browser and keeps the token", async () => {
    let comeBack: (query: URLSearchParams) => void = () => undefined;
    const { companion, site, token } = setUp({
      listen: async () => ({
        port: 1,
        returned: new Promise((resolve) => {
          comeBack = resolve;
        }),
        close: () => undefined,
      }),
      // The member confirms: the browser brings the code back with the companion's state.
      openBrowser: async (url) => {
        comeBack(new URLSearchParams({ code: "code", etat: new URL(url).searchParams.get("etat") ?? "" }));
      },
    });
    await companion.start();
    await companion.link();
    expect(site.exchange).toHaveBeenCalledWith("code", expect.any(String));
    expect(companion.state()).toMatchObject({ account: member, linking: false, notice: undefined });
    expect(token()).toBe("new-token");
  });

  it("says why the link failed, and can be cancelled", async () => {
    const { companion } = setUp();
    await companion.start();
    const linking = companion.link();
    expect(companion.state().linking).toBe(true);
    companion.cancelLink();
    await linking;
    expect(companion.state()).toMatchObject({ account: undefined, linking: false, notice: "Liaison annulée." });
  });

  it("unlinks the member", async () => {
    const { companion, site, token } = setUp({}, "saved-token");
    await companion.start();
    await companion.unlink();
    expect(site.unlink).toHaveBeenCalledWith("saved-token");
    expect(companion.state().account).toBeUndefined();
    expect(token()).toBeUndefined();
  });

  it("looks in the folder the player chose, and says when the addon is not there", async () => {
    const { companion, saved } = setUp({ folders: disk(`/Volumes/T7/World of Warcraft/_classic_beta_/${TOC}`) });
    await companion.start();
    expect(companion.state().installations).toEqual([]);
    await companion.chooseGameFolder("/Volumes/T7/World of Warcraft");
    expect(companion.state().installations).toEqual(["/Volumes/T7/World of Warcraft/_classic_beta_"]);
    expect(saved().gameFolder).toBe("/Volumes/T7/World of Warcraft");
    await companion.chooseGameFolder("/Volumes/T7");
    expect(companion.state().notice).toBe("Aucune version du jeu avec l'addon VXV dans ce dossier.");
  });

  it("offers a newer version of the companion once known", async () => {
    const { companion } = setUp();
    await companion.start();
    expect(companion.state().update).toBeUndefined();
    companion.announceUpdate({ version: "1.1.0", ready: true });
    expect(companion.state().update).toEqual({ version: "1.1.0", ready: true });
  });

  it("starts with the computer or not, as the player chooses", async () => {
    const { companion, dependencies, saved } = setUp();
    await companion.start();
    await companion.setLaunchAtLogin(false);
    expect(dependencies.applyLaunchAtLogin).toHaveBeenLastCalledWith(false);
    expect(saved().launchAtLogin).toBe(false);
  });

  describe("synchronisation", () => {
    it("brings the next event to the game at launch", async () => {
      const { companion, inboxes } = setUp({}, "saved-token");
      await companion.start();
      expect(inboxes.get("/Applications/World of Warcraft/_classic_")).toContain('raid = "VXV-RAID-2\\010E;e1;');
      expect(companion.state().lastSync).toEqual({
        at: NOW,
        raid: { title: "Onyxia", startsAt: "2026-12-10T20:00:00.000Z" },
        outdated: [],
        sent: [],
      });
    });

    it("waits for the link, then synchronises at once", async () => {
      const { companion, site, inboxes } = setUp();
      await companion.start();
      expect(site.download).not.toHaveBeenCalled();
      expect(inboxes.size).toBe(0);
      await companion.syncNow();
      expect(site.download).not.toHaveBeenCalled();
    });

    it("names the versions of the game whose addon is too old for the companion", async () => {
      const { companion, dependencies } = setUp({}, "saved-token");
      dependencies.gameFiles.writeInbox = async () => false;
      await companion.start();
      expect(companion.state().lastSync?.outdated).toEqual(["/Applications/World of Warcraft/_classic_"]);
    });

    it("synchronises again every few minutes, and clears a past problem", async () => {
      vi.useFakeTimers();
      const { companion, site } = setUp({}, "saved-token");
      vi.mocked(site.download).mockRejectedValueOnce(new SiteError("Le site VXV ne répond pas."));
      await companion.start();
      expect(companion.state().notice).toBe("Le site VXV ne répond pas.");
      await vi.advanceTimersByTimeAsync(SYNC_EVERY_MS);
      expect(site.download).toHaveBeenCalledTimes(2);
      expect(companion.state()).toMatchObject({ notice: undefined, syncing: false });
    });

    it("takes an officer's saved data to the website once, then what the game saves again", async () => {
      vi.useFakeTimers();
      const { companion, site, savedData } = setUp({}, "saved-token");
      savedData.set("/wow/WTF/Account/A/SavedVariables/VXV_Sync.lua", { text: SAVED_DATA, modifiedAt: 1 });
      await companion.start();
      expect(site.upload).toHaveBeenCalledWith("saved-token", {
        roster: { text: "VXV-ROSTER-1\nÐéjà;Vu;ROGUE", capturedAt: 1796904000 },
        raidLogs: ["VXV-LOG-1\nR;e1;1796904000;1796904120"],
        characters: [{ name: "Ðéjà Vu", race: "Scourge", sex: 3 }],
        changes: [],
        counters: [],
        texts: {},
      });
      expect(companion.state().lastUpload).toEqual({
        at: NOW,
        messages: ["Liste de guilde à jour.", "Journal du raid importé."],
      });
      // A /reload: the game writes the same data again, plus the record of a second raid.
      savedData.set("/wow/WTF/Account/A/SavedVariables/VXV_Sync.lua", {
        text: SAVED_DATA.replace('["e1"]', '["e2"] = "VXV-LOG-1\\nR;e2;1;2",\n\t\t["e1"]'),
        modifiedAt: 2,
      });
      await vi.advanceTimersByTimeAsync(WATCH_EVERY_MS);
      expect(site.upload).toHaveBeenCalledTimes(2);
      expect(site.upload).toHaveBeenLastCalledWith("saved-token", {
        raidLogs: ["VXV-LOG-1\nR;e2;1;2"],
        characters: [],
        changes: [],
        counters: [],
        texts: {},
      });
    });

    it("sends each bundle's text once, then again when the game saves it changed", async () => {
      vi.useFakeTimers();
      const { companion, site, savedData } = setUp({}, "saved-token");
      vi.mocked(site.me).mockResolvedValue({ name: "Thom", roles: ["member"] });
      const professions = (level: number) =>
        [
          "VXV_SyncDB = {",
          `\t["texts"] = { ["metiers"] = { ["Thom Leboss"] = "VXV-METIERS-1\\nP;129;Secourisme;${String(level)}" } },`,
          "}",
        ].join("\n");
      savedData.set("/wow/WTF/Account/A/SavedVariables/VXV_Sync.lua", { text: professions(22), modifiedAt: 1 });
      await companion.start();
      expect(vi.mocked(site.upload).mock.calls[0]?.[1].texts).toEqual({
        metiers: { "Thom Leboss": "VXV-METIERS-1\nP;129;Secourisme;22" },
      });
      // The same text saved again goes nowhere; a new level goes.
      savedData.set("/wow/WTF/Account/A/SavedVariables/VXV_Sync.lua", { text: professions(22), modifiedAt: 2 });
      await vi.advanceTimersByTimeAsync(WATCH_EVERY_MS);
      expect(site.upload).toHaveBeenCalledTimes(1);
      savedData.set("/wow/WTF/Account/A/SavedVariables/VXV_Sync.lua", { text: professions(23), modifiedAt: 3 });
      await vi.advanceTimersByTimeAsync(WATCH_EVERY_MS);
      expect(vi.mocked(site.upload).mock.calls[1]?.[1].texts).toEqual({
        metiers: { "Thom Leboss": "VXV-METIERS-1\nP;129;Secourisme;23" },
      });
    });

    it("sends each boss killed in the combat log once, as the game writes it, without a /reload", async () => {
      vi.useFakeTimers();
      const { companion, site, combatLogs } = setUp({}, "saved-token");
      vi.mocked(site.me).mockResolvedValue({ name: "Thom", roles: ["member"] });
      const log = "/Applications/World of Warcraft/_classic_/Logs/WoWCombatLog-100726_210000.txt";
      const lines = [
        "10/7/2026 21:00:00.0000  COMBAT_LOG_VERSION,22,ADVANCED_LOG_ENABLED,1,BUILD_VERSION,1.60.1,PROJECT_ID,18",
        '10/7/2026 21:00:05.0000  ENCOUNTER_START,1084,"Onyxia",9,40,249',
      ];
      const write = (more: string[]) => {
        lines.push(...more);
        combatLogs.set(log, new TextEncoder().encode(`${lines.join("\n")}\n`));
      };
      write([]);
      await companion.start();
      expect(vi.mocked(site.upload)).not.toHaveBeenCalled();
      // The boss falls: the next look at the log sends it, and only once.
      write(['10/7/2026 21:04:05.0000  ENCOUNTER_END,1084,"Onyxia",9,40,1,240000']);
      await vi.advanceTimersByTimeAsync(WATCH_EVERY_MS);
      const ended = Math.floor(new Date(2026, 9, 7, 21, 4, 5).getTime() / 1000);
      expect(Object.keys(vi.mocked(site.upload).mock.calls[0]?.[1].texts.combat ?? {})).toEqual([
        `1084-${String(ended)}`,
      ]);
      await vi.advanceTimersByTimeAsync(WATCH_EVERY_MS);
      expect(site.upload).toHaveBeenCalledTimes(1);
    });

    it("sends only the characters for a member", async () => {
      const { companion, site, savedData } = setUp({}, "saved-token");
      vi.mocked(site.me).mockResolvedValue({ name: "Thom", roles: ["member"] });
      savedData.set("/wow/WTF/Account/A/SavedVariables/VXV_Sync.lua", { text: SAVED_DATA, modifiedAt: 1 });
      await companion.start();
      expect(site.upload).toHaveBeenCalledWith("saved-token", {
        raidLogs: [],
        characters: [{ name: "Ðéjà Vu", race: "Scourge", sex: 3 }],
        changes: [],
        counters: [],
        texts: {},
      });
    });
  });
});
