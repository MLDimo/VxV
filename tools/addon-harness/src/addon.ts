import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { createLuaVm, type LuaValue, type LuaVm } from "./luaVm.ts";

/** Files of an addon in load order, as its .toc lists them (comments and metadata left out). */
export function readTocFiles(addonDir: string): string[] {
  return readFileSync(join(addonDir, `${basename(addonDir)}.toc`), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((file) => file.replaceAll("\\", "/"));
}

/** The part of the addon a file belongs to: its first folder ("Raid" for Raid/Changes.lua), none at the root. */
export function partOf(file: string): string | undefined {
  const [first, ...rest] = file.split("/");
  return rest.length > 0 ? first : undefined;
}

const MOCKS = new URL("./mocks/", import.meta.url);

/** Runs a mock of the game client (a file of src/mocks) in the VM. */
export function loadMock(vm: LuaVm, name: string): void {
  vm.run(readFileSync(new URL(`${name}.lua`, MOCKS), "utf8"), `mocks/${name}`);
}

/**
 * Loads an addon like the client does: each file gets the addon's name and private table as "...". Only the files of
 * these parts load, with the files at the addon's root (an addon without parts loads whole). Files written on the
 * player's computer by another program (the companion) replace those of the repository, by path such as
 * "VXV/Sync/External/Inbox.lua".
 */
export function loadAddon(
  vm: LuaVm,
  addonDir: string,
  { parts, written = {} }: { parts?: readonly string[]; written?: Readonly<Record<string, string>> } = {},
) {
  const name = basename(addonDir);
  const addon = vm.newTable();
  for (const file of readTocFiles(addonDir)) {
    const part = partOf(file);
    if (parts !== undefined && part !== undefined && !parts.includes(part)) {
      continue;
    }
    const code = written[`${name}/${file}`] ?? readFileSync(join(addonDir, file), "utf8");
    vm.run(code, `${name}/${file}`, [name, addon]);
  }
  return {
    name,
    /** Runs test code as if it were a file of the addon, with a part's namespace as "...": "local _, ns = ...". */
    run(code: string, part?: string): LuaValue {
      if (part === undefined) {
        return vm.run(code, `${name}/test`, [name, addon]);
      }
      const inPart = `local name, addon = ...\nreturn (function(...)\n${code}\nend)(name, addon[${JSON.stringify(part)}])`;
      return vm.run(inPart, `${name}/${part}/test`, [name, addon]);
    },
  };
}

export type LoadedAddon = ReturnType<typeof loadAddon>;
export { createLuaVm };
