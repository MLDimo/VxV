import { findInstallations, usualGameFolders, type Computer, type FolderReader } from "../domain/installations.ts";
import { SiteError, UnlinkedError } from "./errors.ts";
import { linkAccount } from "./link.ts";
import type { Account, GameFiles, LoopbackListener, Settings, SettingsStore, SitePort, TokenStore } from "./ports.ts";
import { synchronize, type SyncReport } from "./sync.ts";

/** The companion synchronises this often while it runs, and at once after a link or a new folder. */
export const SYNC_EVERY_MS = 5 * 60 * 1000;

/** What the window shows. */
export interface CompanionState {
  account: Account | undefined;
  /** Waiting for the member to confirm the link in the browser. */
  linking: boolean;
  /** The versions of the game where the VXV addon is installed. */
  installations: string[];
  settings: Settings;
  syncing: boolean;
  /** The last synchronisation that worked. */
  lastSync: SyncReport | undefined;
  /** The last problem met, in French, until the next action. */
  notice: string | undefined;
  version: string;
}

export interface CompanionDependencies {
  site: SitePort;
  tokens: TokenStore;
  settings: SettingsStore;
  folders: FolderReader;
  gameFiles: GameFiles;
  computer(): Promise<Computer>;
  listen(): Promise<LoopbackListener>;
  openBrowser(url: string): Promise<void>;
  /** Starts the companion with the computer, or not. */
  applyLaunchAtLogin(on: boolean): void;
  version: string;
  clock?: () => Date;
}

const NO_ADDON_THERE = "Aucune version du jeu avec l'addon VXV dans ce dossier.";

/** The companion's state and the player's actions on it. */
export function createCompanion(dependencies: CompanionDependencies) {
  const { site, tokens, settings: settingsStore, folders, gameFiles, clock = () => new Date() } = dependencies;
  const listeners = new Set<(state: CompanionState) => void>();
  let token: string | undefined;
  let linkAbort: AbortController | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let state: CompanionState = {
    account: undefined,
    linking: false,
    installations: [],
    settings: { gameFolder: undefined, launchAtLogin: true },
    syncing: false,
    lastSync: undefined,
    notice: undefined,
    version: dependencies.version,
  };

  function update(changes: Partial<CompanionState>): void {
    state = { ...state, ...changes };
    for (const listener of listeners) {
      listener(state);
    }
  }

  async function forgetToken(): Promise<void> {
    token = undefined;
    await tokens.clear();
  }

  /** Shows a problem of the website; a refused token unlinks the companion. */
  async function report(error: unknown): Promise<void> {
    if (error instanceof UnlinkedError) {
      await forgetToken();
      update({ account: undefined, notice: error.message });
    } else if (error instanceof SiteError) {
      update({ notice: error.message });
    } else {
      throw error;
    }
  }

  /** The player's chosen folder first, then the usual ones. */
  async function detect(settings: Settings): Promise<string[]> {
    const usual = usualGameFolders(await dependencies.computer(), folders.join);
    return findInstallations(settings.gameFolder === undefined ? usual : [settings.gameFolder, ...usual], folders);
  }

  async function saveSettings(settings: Settings): Promise<void> {
    await settingsStore.write(settings);
    update({ settings });
  }

  /** Brings the website's data to the game, once linked and the game found; one synchronisation at a time. */
  async function syncNow(): Promise<void> {
    if (token === undefined || state.installations.length === 0 || state.syncing) {
      return;
    }
    update({ syncing: true });
    try {
      const lastSync = await synchronize({ site, gameFiles }, token, state.installations, clock());
      update({ lastSync, notice: undefined });
    } catch (error) {
      await report(error);
    } finally {
      update({ syncing: false });
    }
  }

  return {
    state: (): CompanionState => state,

    /** Calls the listener at each change; returns how to stop. */
    onChange(listener: (state: CompanionState) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** At launch: the settings, the game's installations, the member of the saved token, then the synchronisations. */
    async start(): Promise<void> {
      const settings = await settingsStore.read();
      dependencies.applyLaunchAtLogin(settings.launchAtLogin);
      update({ settings, installations: await detect(settings) });
      token = await tokens.read();
      if (token !== undefined) {
        await site.me(token).then((account) => update({ account }), report);
      }
      await syncNow();
      timer ??= setInterval(() => void syncNow(), SYNC_EVERY_MS);
    },

    syncNow,

    /** Stops the synchronisations, when the companion quits. */
    stop(): void {
      clearInterval(timer);
      timer = undefined;
    },

    /** Links the companion through the browser; a second call while waiting does nothing. */
    async link(): Promise<void> {
      if (state.linking) {
        return;
      }
      linkAbort = new AbortController();
      update({ linking: true, notice: undefined });
      try {
        const linked = await linkAccount(
          { api: site, listen: dependencies.listen, openBrowser: dependencies.openBrowser },
          linkAbort.signal,
        );
        token = linked.token;
        await tokens.write(linked.token);
        update({ account: linked.member });
        void syncNow();
      } catch (error) {
        await report(error);
      } finally {
        linkAbort = undefined;
        update({ linking: false });
      }
    },

    cancelLink(): void {
      linkAbort?.abort();
    },

    async unlink(): Promise<void> {
      if (token !== undefined) {
        await site.unlink(token);
      }
      await forgetToken();
      update({ account: undefined, lastSync: undefined, notice: undefined });
    },

    /** The player shows where the game is, when it is not in its usual places. */
    async chooseGameFolder(folder: string): Promise<void> {
      const settings = { ...state.settings, gameFolder: folder };
      await saveSettings(settings);
      const installations = await detect(settings);
      update({ installations, notice: installations.length === 0 ? NO_ADDON_THERE : undefined });
      await syncNow();
    },

    async setLaunchAtLogin(on: boolean): Promise<void> {
      dependencies.applyLaunchAtLogin(on);
      await saveSettings({ ...state.settings, launchAtLogin: on });
    },
  };
}

export type Companion = ReturnType<typeof createCompanion>;
