import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import luaparse from "luaparse";
import { readTocFiles } from "./addon.ts";
import type { LuaVm } from "./luaVm.ts";

const REPOSITORY = new URL("../../../", import.meta.url);
/** Third-party or generated code, outside our line length rule. */
const FOREIGN_FOLDERS = ["External/", "Libs/"];

/** The conventions of .luacheckrc, checked here since luacheck is not part of the toolchain. */
export function luacheckRules(): { maxLineLength: number; allowedGlobals: Set<string> } {
  const luacheckrc = readFileSync(new URL(".luacheckrc", REPOSITORY), "utf8");
  const maxLineLength = Number(/^max_line_length\s*=\s*(\d+)/m.exec(luacheckrc)?.[1]);
  const globalsBlock = /^globals\s*=\s*\{([^}]*)\}/m.exec(luacheckrc)?.[1] ?? "";
  return {
    maxLineLength,
    allowedGlobals: new Set([...globalsBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1] ?? "")),
  };
}

/** Every addon of the repository: the phase 0 probe and the bundles of addon/. */
export function addonDirectories(): string[] {
  const addonRoot = new URL("addon/", REPOSITORY).pathname;
  const bundles = readdirSync(addonRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  return [new URL("tools/VXV_Probe", REPOSITORY).pathname, ...bundles.map((entry) => join(addonRoot, entry.name))];
}

/** Problems of the addon's files: Lua 5.1 syntax everywhere, line length in our own code. */
export function sourceProblems(addonDir: string): string[] {
  const { maxLineLength } = luacheckRules();
  const problems: string[] = [];
  for (const file of readTocFiles(addonDir)) {
    const code = readFileSync(join(addonDir, file), "utf8");
    try {
      luaparse.parse(code, { luaVersion: "5.1" });
    } catch (error) {
      problems.push(`${file}: ${String(error)}`);
    }
    if (FOREIGN_FOLDERS.some((folder) => file.startsWith(folder))) {
      continue;
    }
    code.split("\n").forEach((line, index) => {
      if ([...line].length > maxLineLength) {
        problems.push(`${file}:${index + 1}: line longer than ${maxLineLength} characters`);
      }
    });
  }
  return problems;
}

/** Starts watching the global table; the returned function lists the globals created since. */
export function trackNewGlobals(vm: LuaVm): () => string[] {
  const seen = vm.newTable();
  vm.run("local seen = ... for name in pairs(_G) do seen[name] = true end", "globals/snapshot", [seen]);
  return () => {
    const created = vm.run(
      `local seen = ...
       local created = {}
       for name in pairs(_G) do
           if not seen[name] then created[#created + 1] = name end
       end
       table.sort(created)
       return created`,
      "globals/diff",
      [seen],
    );
    return Array.isArray(created) ? created.map(String) : [];
  };
}
