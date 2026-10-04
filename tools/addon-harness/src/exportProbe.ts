// Usage: npm run export:probe -- <WTF/Account/<ACCOUNT>/SavedVariables/VXV_Probe.lua>
// Prints the probe journal saved by the game, formatted by the addon's own Log.Format.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createLuaVm, loadAddon, loadMock } from "./addon.ts";
import { PROBE_DIR } from "./probe.ts";

const [savedVariablesFile] = process.argv.slice(2);
if (savedVariablesFile === undefined) {
  throw new Error("usage: npm run export:probe -- <SavedVariables/VXV_Probe.lua>");
}
const vm = createLuaVm();
loadMock(vm, "probe");
const probe = loadAddon(vm, PROBE_DIR);
vm.run(readFileSync(resolve(savedVariablesFile), "utf8"), "SavedVariables");
console.log(
  probe.run(`
    local _, ns = ...
    local lines = {}
    for _, entry in ipairs(VXV_ProbeDB.log or {}) do
        lines[#lines + 1] = ns.Log.Format(entry, false)
    end
    return table.concat(lines, "\\n")
  `),
);
