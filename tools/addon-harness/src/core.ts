import { createLuaVm, loadAddon, loadMock } from "./addon.ts";
import { trackNewGlobals } from "./conventions.ts";

export const CORE_DIR = new URL("../../../addon/VXV_Core", import.meta.url).pathname;

export interface CoreStart {
  /** What the game read from SavedVariables/VXV_Core.lua, as Lua code; nothing at the first installation. */
  savedVariables?: string;
  /** Stops before the player enters the world (PLAYER_LOGIN). */
  beforeLogin?: boolean;
  /** "Prénom Nom" of the player of this client. */
  playerName?: string;
  inGuild?: boolean;
}

/** VXV_Core loaded on the mocked client like the game does: files, ADDON_LOADED, then PLAYER_LOGIN. */
export function startCore({ savedVariables, beforeLogin = false, playerName, inGuild = true }: CoreStart = {}) {
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
  const core = loadAddon(vm, CORE_DIR);
  const client = (code: string) => vm.run(code, "client");
  client('Fire("ADDON_LOADED", "VXV_Core")');
  if (!beforeLogin) {
    client('Fire("PLAYER_LOGIN")');
  }
  return {
    core,
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
