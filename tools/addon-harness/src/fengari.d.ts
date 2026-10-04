/** The part of fengari (Lua 5.3 VM in JavaScript, run in Lua 5.1 style) the harness uses. */
declare module "fengari" {
  export interface LuaState {
    readonly luaState: unique symbol;
  }

  interface Lua {
    readonly LUA_REGISTRYINDEX: number;
    readonly LUA_MULTRET: number;
    readonly LUA_TNIL: number;
    readonly LUA_TBOOLEAN: number;
    readonly LUA_TNUMBER: number;
    readonly LUA_TSTRING: number;
    readonly LUA_TTABLE: number;
    lua_pcall(L: LuaState, nargs: number, nresults: number, msgh: number): number;
    lua_tojsstring(L: LuaState, index: number): string;
    lua_pushstring(L: LuaState, value: Uint8Array): void;
    lua_pushnil(L: LuaState): void;
    lua_pushvalue(L: LuaState, index: number): void;
    lua_rawgeti(L: LuaState, index: number, n: number): number;
    lua_newtable(L: LuaState): void;
    lua_type(L: LuaState, index: number): number;
    lua_toboolean(L: LuaState, index: number): boolean;
    lua_tonumber(L: LuaState, index: number): number;
    lua_next(L: LuaState, index: number): number | boolean;
    lua_gettop(L: LuaState): number;
    lua_settop(L: LuaState, index: number): void;
    lua_pop(L: LuaState, n: number): void;
  }

  interface LuaAuxLib {
    luaL_newstate(): LuaState;
    luaL_loadbuffer(L: LuaState, buffer: Uint8Array, size: number | null, name: Uint8Array): number;
    luaL_ref(L: LuaState, table: number): number;
  }

  interface LuaLib {
    luaL_openlibs(L: LuaState): void;
  }

  const fengari: { lua: Lua; lauxlib: LuaAuxLib; lualib: LuaLib; to_luastring(value: string): Uint8Array };
  export default fengari;
}
