/** Minimal typings for the parts of fengari (Lua 5.3 in JavaScript) used by the tests. */
declare module "fengari" {
  export type LuaState = object;
  export const lua: {
    LUA_OK: number;
    lua_pcall(state: LuaState, argumentCount: number, resultCount: number, handler: number): number;
    lua_tojsstring(state: LuaState, index: number): string;
  };
  export const lauxlib: {
    luaL_newstate(): LuaState;
    luaL_loadstring(state: LuaState, source: Uint8Array): number;
  };
  export const lualib: {
    luaL_openlibs(state: LuaState): void;
  };
  export function to_luastring(text: string): Uint8Array;
}
