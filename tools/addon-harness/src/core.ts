import { createLuaVm, loadAddon, loadMock } from "./addon.ts";
import { trackNewGlobals } from "./conventions.ts";

export const CORE_DIR = new URL("../../../addon/VXV_Core", import.meta.url).pathname;

export interface CoreStart {
  /** What the game read from SavedVariables/VXV_Core.lua, as Lua code; nothing at the first installation. */
  savedVariables?: string;
  /** Stops before the player enters the world (PLAYER_LOGIN). */
  beforeLogin?: boolean;
}

/** VXV_Core loaded on the mocked client like the game does: files, ADDON_LOADED, then PLAYER_LOGIN. */
export function startCore({ savedVariables, beforeLogin = false }: CoreStart = {}) {
  const vm = createLuaVm();
  loadMock(vm, "wow");
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
    errors: () => client("return ReportedErrors"),
    registeredEvents: () => Object.keys(client("return RegisteredEvents") as Record<string, boolean>).sort(),
  };
}
