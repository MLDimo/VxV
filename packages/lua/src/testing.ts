// fengari has no typings: the packages that use this helper need ours along with it.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- an import cannot carry ambient typings
/// <reference path="./fengari.d.ts" />
import { lauxlib, lua, lualib, to_luastring, type LuaState } from "fengari";
import luaparse from "luaparse";

/** Lua helper that converts any data table to JSON (strings escaped, lists detected by length). */
const TO_JSON = `
local function toJson(value)
  local kind = type(value)
  if kind == "string" then
    return '"' .. value:gsub('[%c"\\\\]', function(char) return string.format("\\\\u%04x", char:byte()) end) .. '"'
  elseif kind == "number" or kind == "boolean" then
    return tostring(value)
  elseif kind == "table" then
    local parts = {}
    if #value > 0 then
      for index, item in ipairs(value) do parts[index] = toJson(item) end
      return "[" .. table.concat(parts, ",") .. "]"
    end
    for key, item in pairs(value) do parts[#parts + 1] = toJson(tostring(key)) .. ":" .. toJson(item) end
    return "{" .. table.concat(parts, ",") .. "}"
  end
  error("unsupported Lua type: " .. kind)
end
`;

function run(state: LuaState, source: string): void {
  if (
    lauxlib.luaL_loadstring(state, to_luastring(source)) !== lua.LUA_OK ||
    lua.lua_pcall(state, 0, 1, 0) !== lua.LUA_OK
  ) {
    throw new Error(lua.lua_tojsstring(state, -1));
  }
}

/**
 * Checks that the chunk is valid Lua 5.1 (the game's version), runs it, then returns the value of
 * the given expression converted to JavaScript.
 */
export function evaluateLua(chunk: string, expression: string): unknown {
  luaparse.parse(chunk, { luaVersion: "5.1" });
  const state = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(state);
  run(state, chunk);
  run(state, `${TO_JSON}\nreturn toJson(${expression})`);
  return JSON.parse(lua.lua_tojsstring(state, -1));
}
