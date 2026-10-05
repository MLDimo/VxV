import { posix } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FolderReader } from "../domain/installations.ts";
import { createCompanion, SYNC_EVERY_MS, type Companion, type CompanionDependencies } from "./companion.ts";
import { SiteError, UnlinkedError } from "./errors.ts";
import type { Settings, SitePort } from "./ports.ts";

const member = { name: "Martin", roles: ["member", "officer"] };
const NEXT_RAID = {
  text: "VXV-RAID-1\nE;e1;1796932800;1796931900;2;Onyxia",
  title: "Onyxia",
  startsAt: "2026-12-10T20:00:00.000Z",
};
const NOW = new Date("2026-12-10T19:45:00Z");
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
  const site: SitePort = {
    linkPage: ({ state }) => `https://vxv.example/compagnon/relier?etat=${state}`,
    exchange: vi.fn(async () => ({ token: "new-token", member })),
    me: vi.fn(async () => member),
    unlink: vi.fn(async () => undefined),
    download: vi.fn(async () => ({ raid: NEXT_RAID })),
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
  return { companion, dependencies, site, inboxes, token: () => token, saved: () => saved };
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
      expect(inboxes.get("/Applications/World of Warcraft/_classic_")).toContain('raid = "VXV-RAID-1\\010E;e1;');
      expect(companion.state().lastSync).toEqual({
        at: NOW,
        raid: { title: "Onyxia", startsAt: "2026-12-10T20:00:00.000Z" },
        outdated: [],
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
      const { companion } = setUp({ gameFiles: { writeInbox: async () => false } }, "saved-token");
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
  });
});
