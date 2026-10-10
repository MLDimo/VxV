import { createLuaVm, loadAddon, loadMock } from "./addon.ts";
import type { LuaValue } from "./luaVm.ts";
import { trackNewGlobals } from "./conventions.ts";

/** The addon: the core and its parts, each in its folder of addon/VXV. */
export const ADDON_DIR = new URL("../../../addon/VXV", import.meta.url).pathname;
const ADDON_NAME = "VXV";

/** A part of the addon loaded on the client: test code runs in its namespace. */
export interface LoadedPart {
  run(code: string): LuaValue;
}

export interface CoreStart {
  /** What the game read from SavedVariables/VXV.lua, as Lua code; nothing at the first installation. */
  savedVariables?: string;
  /** Stops before the player enters the world (PLAYER_LOGIN). */
  beforeLogin?: boolean;
  /** "Prénom Nom" of the player of this client. */
  playerName?: string;
  inGuild?: boolean;
  /** The parts of the addon loaded with its core ("Raid", "Sync"…), as the client loads the addon's files in order. */
  bundles?: readonly string[];
  /** Files another program wrote in the addon's folder, by path ("VXV/Sync/External/Inbox.lua"). */
  written?: Readonly<Record<string, string>>;
}

/** The addon loaded on the mocked client like the game does: its files, ADDON_LOADED, then PLAYER_LOGIN. */
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
  const addon = loadAddon(vm, ADDON_DIR, { parts: ["Core", ...bundles], written });
  client(`Fire("ADDON_LOADED", ${JSON.stringify(ADDON_NAME)})`);
  const part = (name: string): LoadedPart => ({ run: (code) => addon.run(code, name) });
  const loadedBundles = Object.fromEntries(bundles.map((name) => [name, part(name)]));
  if (!beforeLogin) {
    client('Fire("PLAYER_LOGIN")');
  }
  return {
    core: part("Core"),
    /** The loaded parts by name, to run test code in their namespace. */
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

/** A part of the addon the client loaded, to run test code in its namespace. */
export function loadedBundle(started: ReturnType<typeof startCore>, name: string) {
  const bundle = started.bundles[name];
  if (bundle === undefined) {
    throw new Error(`${name} was not loaded`);
  }
  return bundle;
}
