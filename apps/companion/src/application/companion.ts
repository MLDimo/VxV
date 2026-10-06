import { findInstallations, usualGameFolders, type Computer, type FolderReader } from "../domain/installations.ts";
import { SiteError, UnlinkedError } from "./errors.ts";
import { linkAccount } from "./link.ts";
import type {
  Account,
  GameFiles,
  LoopbackListener,
  Settings,
  SettingsStore,
  SitePort,
  TokenStore,
  UpdateNotice,
} from "./ports.ts";
import { synchronize, type SyncReport } from "./sync.ts";

/** The companion synchronises this often while it runs, and at once after a link or a new folder. */
export const SYNC_EVERY_MS = 5 * 60 * 1000;
/** And this often, it looks whether the game saved its data again (a /reload, a logout): they go at once. */
export const WATCH_EVERY_MS = 15 * 1000;

const OFFICER_ROLES = new Set(["officer", "gm"]);

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
  /** The last time the website received something new from the game, and what it made of it. */
  lastUpload: { at: Date; messages: string[] } | undefined;
  /** The last problem met, in French, until the next action. */
  notice: string | undefined;
  version: string;
  /** A newer version of the companion, once known. */
  update: UpdateNotice | undefined;
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
  let watcher: ReturnType<typeof setInterval> | undefined;
  /** What the website already received during this launch. */
  const sent = new Set<string>();
  /** When the game last saved each file of saved data, as last seen. */
  let savedSeen = new Map<string, number>();
  /** Asked again while a synchronisation was running. */
  let again = false;
  let state: CompanionState = {
    account: undefined,
    linking: false,
    installations: [],
    settings: { gameFolder: undefined, launchAtLogin: true },
    syncing: false,
    lastSync: undefined,
    lastUpload: undefined,
    notice: undefined,
    version: dependencies.version,
    update: undefined,
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

  /** True when the game saved its data again since last seen. */
  async function savedDataChanged(): Promise<boolean> {
    const files = (
      await Promise.all(state.installations.map((installation) => gameFiles.savedFiles(installation)))
    ).flat();
    const changed = files.some((file) => savedSeen.get(file.path) !== file.modifiedAt);
    savedSeen = new Map(files.map((file) => [file.path, file.modifiedAt]));
    return changed;
  }

  /**
   * Takes the game's saved data to the website and brings the website's data to the game, once linked and the
   * game found. One synchronisation at a time: asked meanwhile, the next one follows.
   */
  async function syncNow(): Promise<void> {
    if (token === undefined || state.installations.length === 0) {
      return;
    }
    if (state.syncing) {
      again = true;
      return;
    }
    update({ syncing: true });
    try {
      await savedDataChanged();
      const account = state.account ?? (await site.me(token));
      const officer = account.roles.some((role) => OFFICER_ROLES.has(role));
      const lastSync = await synchronize(
        { site, gameFiles },
        { token, installations: state.installations, officer, now: clock(), sent },
      );
      const lastUpload = lastSync.sent.length > 0 ? { at: lastSync.at, messages: lastSync.sent } : state.lastUpload;
      update({ account, lastSync, lastUpload, notice: undefined });
    } catch (error) {
      await report(error);
    } finally {
      update({ syncing: false });
    }
    if (again) {
      again = false;
      await syncNow();
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
      watcher ??= setInterval(() => {
        void savedDataChanged().then((changed) => (changed ? syncNow() : undefined));
      }, WATCH_EVERY_MS);
    },

    syncNow,

    /** Stops the synchronisations, when the companion quits. */
    stop(): void {
      clearInterval(timer);
      clearInterval(watcher);
      timer = undefined;
      watcher = undefined;
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
      sent.clear();
      update({ account: undefined, lastSync: undefined, lastUpload: undefined, notice: undefined });
    },

    /** The player shows where the game is, when it is not in its usual places. */
    async chooseGameFolder(folder: string): Promise<void> {
      const settings = { ...state.settings, gameFolder: folder };
      await saveSettings(settings);
      const installations = await detect(settings);
      update({ installations, notice: installations.length === 0 ? NO_ADDON_THERE : undefined });
      await syncNow();
    },

    /** A newer version of the companion is known: the window offers it. */
    announceUpdate(notice: UpdateNotice): void {
      update({ update: notice });
    },

    async setLaunchAtLogin(on: boolean): Promise<void> {
      dependencies.applyLaunchAtLogin(on);
      await saveSettings({ ...state.settings, launchAtLogin: on });
    },
  };
}

export type Companion = ReturnType<typeof createCompanion>;
