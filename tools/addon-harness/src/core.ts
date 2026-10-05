import { createLuaVm, loadAddon, loadMock } from "./addon.ts";
import { trackNewGlobals } from "./conventions.ts";

export const CORE_DIR = new URL("../../../addon/VXV_Core", import.meta.url).pathname;

/** Folder of a bundle of addon/, such as VXV_Raid. */
export function bundleDir(name: string): string {
  return new URL(`../../../addon/${name}`, import.meta.url).pathname;
}

export interface CoreStart {
  /** What the game read from SavedVariables/VXV_Core.lua, as Lua code; nothing at the first installation. */
  savedVariables?: string;
  /** Stops before the player enters the world (PLAYER_LOGIN). */
  beforeLogin?: boolean;
  /** "Prénom Nom" of the player of this client. */
  playerName?: string;
  inGuild?: boolean;
  /** Bundles loaded after VXV_Core, in this order, as the client does with their dependency on it. */
  bundles?: readonly string[];
  /** Files another program wrote in the addons' folders, by path ("VXV_Sync/External/Inbox.lua"). */
  written?: Readonly<Record<string, string>>;
}

/** VXV_Core loaded on the mocked client like the game does: files, ADDON_LOADED, then PLAYER_LOGIN. */
export function startCore({
  savedVariables,
  beforeLogin = false,
  playerName,
  inGuild = true,
  bundles = [],
  written = {},
}: CoreStart = {}) {
  const vm = createLuaVm();
  loadMock(vm, "wow");
  vm.run(`Player.inGuild = ${String(inGuild)}`, "client");
  if (playerName !== undefined) {
    vm.run(`Player.name = ${JSON.stringify(playerName)}`, "client");
  }
  const newGlobals = trackNewGlobals(vm);
  if (savedVariables !== undefined) {
    vm.run(`VXV_DB = ${savedVariables}`, "SavedVariables");
  }
  const client = (code: string) => vm.run(code, "client");
  const core = loadAddon(vm, CORE_DIR);
  client('Fire("ADDON_LOADED", "VXV_Core")');
  const loadedBundles = Object.fromEntries(
    bundles.map((name) => {
      const bundle = loadAddon(vm, bundleDir(name), written);
      client(`Fire("ADDON_LOADED", ${JSON.stringify(name)})`);
      return [name, bundle];
    }),
  );
  if (!beforeLogin) {
    client('Fire("PLAYER_LOGIN")');
  }
  return {
    core,
    /** The loaded bundles by name, to run test code in their namespace. */
    bundles: loadedBundles,
    client,
    newGlobals,
    /** Errors reported to the game's error handler (BugSack), always as a list. */
    errors: (): string[] => {
      const reported = client("return ReportedErrors");
      return Array.isArray(reported) ? reported.map(String) : [];
    },
    registeredEvents: () => Object.keys(client("return RegisteredEvents") as Record<string, boolean>).sort(),
  };
}
