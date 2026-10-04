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

const MOCKS = new URL("./mocks/", import.meta.url);

/** Runs a mock of the game client (a file of src/mocks) in the VM. */
export function loadMock(vm: LuaVm, name: string): void {
  vm.run(readFileSync(new URL(`${name}.lua`, MOCKS), "utf8"), `mocks/${name}`);
}

/** Loads an addon like the client does: each file gets the addon's name and private namespace as "...". */
export function loadAddon(vm: LuaVm, addonDir: string) {
  const name = basename(addonDir);
  const namespace = vm.newTable();
  for (const file of readTocFiles(addonDir)) {
    vm.run(readFileSync(join(addonDir, file), "utf8"), `${name}/${file}`, [name, namespace]);
  }
  return {
    name,
    /** Runs test code as if it were a file of the addon ("local addonName, ns = ..."). */
    run(code: string): LuaValue {
      return vm.run(code, `${name}/test`, [name, namespace]);
    },
  };
}

export type LoadedAddon = ReturnType<typeof loadAddon>;
export { createLuaVm };
