// Loads an addon into a fengari Lua VM on top of the mocked WoW API.
const fs = require('fs');
const path = require('path');
const { lua, lauxlib, lualib, to_luastring } = require('fengari');

function readTocFiles(addonDir) {
  const addonName = path.basename(addonDir);
  return fs.readFileSync(path.join(addonDir, `${addonName}.toc`), 'utf8')
    .split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'))
    .map((file) => file.replace(/\\/g, '/'));
}

function loadProbe(addonDir) {
  const addonName = path.basename(addonDir);
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  lua.lua_newtable(L);
  const namespaceRef = lauxlib.luaL_ref(L, lua.LUA_REGISTRYINDEX);

  // Runs a chunk; withNamespace passes (addonName, ns) as the addon files receive them.
  function runChunk(code, name, withNamespace = false) {
    if (lauxlib.luaL_loadbuffer(L, to_luastring(code), null, to_luastring(name)) !== 0) {
      throw new Error(lua.lua_tojsstring(L, -1));
    }
    let argCount = 0;
    if (withNamespace) {
      lua.lua_pushstring(L, to_luastring(addonName));
      lua.lua_rawgeti(L, lua.LUA_REGISTRYINDEX, namespaceRef);
      argCount = 2;
    }
    if (lua.lua_pcall(L, argCount, 0, 0) !== 0) {
      throw new Error(`${name}: ${lua.lua_tojsstring(L, -1)}`);
    }
  }

  function getGlobalString(name) {
    lua.lua_getglobal(L, to_luastring(name));
    const value = lua.lua_tojsstring(L, -1);
    lua.lua_pop(L, 1);
    return value;
  }

  runChunk(fs.readFileSync(path.join(__dirname, 'mock.lua'), 'utf8'), 'mock');
  for (const file of readTocFiles(addonDir)) {
    runChunk(fs.readFileSync(path.join(addonDir, file), 'utf8'), file, true);
  }
  return { runChunk, getGlobalString };
}

module.exports = { loadProbe, readTocFiles };
