import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createLuaVm, loadAddon, loadMock } from "./addon.ts";
import { luacheckRules, trackNewGlobals } from "./conventions.ts";
import { PROBE_DIR } from "./probe.ts";

describe("VXV_Probe (phase 0)", () => {
  it("runs every command against the mocked client, without creating globals beyond .luacheckrc", () => {
    const vm = createLuaVm();
    loadMock(vm, "probe");
    const newGlobals = trackNewGlobals(vm);
    loadAddon(vm, PROBE_DIR);
    vm.run(readFileSync(new URL("./scenarios/probe.lua", import.meta.url), "utf8"), "scenarios/probe");
    const { allowedGlobals } = luacheckRules();
    expect(newGlobals().filter((name) => !allowedGlobals.has(name))).toEqual([]);
  });
});
