import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import luaparse from "luaparse";
import { readTocFiles } from "./addon.ts";
import type { LuaVm } from "./luaVm.ts";

const REPOSITORY = new URL("../../../", import.meta.url);
/** Third-party or generated code (written by the companion, by npm run generate), outside our line length rule. */
const FOREIGN_FOLDERS = ["External", "Libs", "Data"];

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

/** Every addon of the repository: the phase 0 probe and the addons of addon/ (VXV). */
export function addonDirectories(): string[] {
  const addonRoot = new URL("addon/", REPOSITORY).pathname;
  const addons = readdirSync(addonRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  return [new URL("tools/VXV_Probe", REPOSITORY).pathname, ...addons.map((entry) => join(addonRoot, entry.name))];
}

/**
 * The files of an addon made of parts that reach beyond their own: each file of a part (its first folder) takes that
 * part's namespace, "local ns = select(2, ...).Raid", and no other; the other parts are only seen through the core's
 * public API, the VXV global.
 */
export function namespaceProblems(addonDir: string): string[] {
  return readTocFiles(addonDir).flatMap((file) => {
    const [part, ...rest] = file.split("/");
    if (rest.length === 0 || part === undefined || FOREIGN_FOLDERS.includes(part)) {
      return [];
    }
    const code = readFileSync(join(addonDir, file), "utf8");
    const taken = [...code.matchAll(/select\(2, \.\.\.\)\.(\w+)/g)].map((match) => match[1]);
    // The file's own "...", read otherwise than for its part's namespace (or the addon's name).
    const otherVarargs = code
      .split("\n")
      .filter((line) => /^local [\w, ]+ = \.\.\.$/.test(line) && line !== "local ADDON_NAME = ...");
    const problems =
      taken.length === 1 && taken[0] === part
        ? []
        : [`${file}: takes ${taken.join(", ") || "no"} namespace, not ${part}'s`];
    return [...problems, ...otherVarargs.map((line) => `${file}: ${line}`)];
  });
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
    if (file.split("/").some((folder) => FOREIGN_FOLDERS.includes(folder))) {
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
