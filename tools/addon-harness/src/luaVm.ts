import fengari, { type LuaState } from "fengari";

const { lua, lauxlib, lualib, to_luastring } = fengari;

/** A Lua value read back in JavaScript: tables become arrays (keys 1..n) or objects. */
export type LuaValue = undefined | boolean | number | string | LuaValue[] | { [key: string]: LuaValue };

/** What a chunk receives as "...": a string, or a table kept by the VM (an addon's private namespace). */
export type LuaArgument = string | { tableRef: number };

function toJs(L: LuaState, index: number): LuaValue {
  switch (lua.lua_type(L, index)) {
    case lua.LUA_TBOOLEAN:
      return lua.lua_toboolean(L, index);
    case lua.LUA_TNUMBER:
      return lua.lua_tonumber(L, index);
    case lua.LUA_TSTRING:
      return lua.lua_tojsstring(L, index);
    case lua.LUA_TTABLE:
      return tableToJs(L, index);
    default:
      return undefined;
  }
}

function tableToJs(L: LuaState, index: number): LuaValue {
  const entries: [string | number, LuaValue][] = [];
  const table = index < 0 ? lua.lua_gettop(L) + index + 1 : index;
  lua.lua_pushnil(L);
  while (lua.lua_next(L, table)) {
    const key = lua.lua_type(L, -2) === lua.LUA_TNUMBER ? lua.lua_tonumber(L, -2) : lua.lua_tojsstring(L, -2);
    entries.push([key, toJs(L, -1)]);
    lua.lua_pop(L, 1);
  }
  const isArray = entries.every(([key]) => typeof key === "number") && entries.length > 0;
  if (isArray) {
    return entries.sort(([left], [right]) => Number(left) - Number(right)).map(([, value]) => value);
  }
  return Object.fromEntries(entries.map(([key, value]) => [String(key), value]));
}

/** One Lua 5.1-style state, as the game client runs every addon in. */
export function createLuaVm() {
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);

  return {
    /** A new empty table kept by the VM, to pass to chunks. */
    newTable(): { tableRef: number } {
      lua.lua_newtable(L);
      return { tableRef: lauxlib.luaL_ref(L, lua.LUA_REGISTRYINDEX) };
    },

    /** Runs a chunk with the given "..." and returns its first result; a Lua error becomes an exception. */
    run(code: string, name: string, args: readonly LuaArgument[] = []): LuaValue {
      const top = lua.lua_gettop(L);
      if (lauxlib.luaL_loadbuffer(L, to_luastring(code), null, to_luastring(name)) !== 0) {
        const message = lua.lua_tojsstring(L, -1);
        lua.lua_settop(L, top);
        throw new Error(message);
      }
      for (const arg of args) {
        if (typeof arg === "string") {
          lua.lua_pushstring(L, to_luastring(arg));
        } else {
          lua.lua_rawgeti(L, lua.LUA_REGISTRYINDEX, arg.tableRef);
        }
      }
      if (lua.lua_pcall(L, args.length, 1, 0) !== 0) {
        const message = lua.lua_tojsstring(L, -1);
        lua.lua_settop(L, top);
        throw new Error(`${name}: ${message}`);
      }
      const result = toJs(L, -1);
      lua.lua_settop(L, top);
      return result;
    },
  };
}

export type LuaVm = ReturnType<typeof createLuaVm>;
