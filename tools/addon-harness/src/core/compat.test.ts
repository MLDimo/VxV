import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readTocFiles } from "../addon.ts";
import { luacheckRules } from "../conventions.ts";
import { CORE_DIR, startCore } from "../core.ts";
import { foreverApi, LUA_ENVIRONMENT, NOT_YET_MEASURED } from "../foreverApi.ts";
import { globalReferences } from "../globalReads.ts";

/** Compat's wrappers and their candidate functions, as written in Compat.lua. */
function compatAliases(): [string, string[]][] {
  const source = readFileSync(join(CORE_DIR, "Core/Compat.lua"), "utf8");
  return [...source.matchAll(/^\s+(\w+) = \{ ((?:"[^"]+",? ?)+)\}/gm)].map((match) => [
    match[1] ?? "",
    [...(match[2] ?? "").matchAll(/"([^"]+)"/g)].map((candidate) => candidate[1] ?? ""),
  ]);
}

describe("Blizzard API of VXV_Core", () => {
  it("reads directly only what was measured on WoW Forever; the rest goes through Compat", () => {
    const allowed = new Set([...LUA_ENVIRONMENT, ...foreverApi(), ...luacheckRules().allowedGlobals]);
    const unmeasured = readTocFiles(CORE_DIR).flatMap((file) =>
      [...globalReferences(readFileSync(join(CORE_DIR, file), "utf8"))]
        .filter((name) => !allowed.has(name) && !allowed.has(name.split(".")[0] ?? ""))
        .map((name) => `${file}: ${name}`),
    );
    expect(unmeasured).toEqual([]);
  });

  it("gives every Compat wrapper a function measured on Forever, or lists it as not yet measured", () => {
    const measured = foreverApi();
    const aliases = compatAliases();
    expect(aliases.length).toBeGreaterThan(0);
    const unproven = aliases
      .filter(([name, candidates]) => !NOT_YET_MEASURED.has(name) && !candidates.some((path) => measured.has(path)))
      .map(([name]) => name);
    expect(unproven).toEqual([]);
  });
});

describe("Compat", () => {
  const compat = (setup: string, call: string) => {
    const { core } = startCore();
    core.run(setup);
    return core.run(`local _, ns = ... return { ns.Compat.${call} }`);
  };

  it("calls the modern function first, then the older one", () => {
    const modernAndOld =
      'C_ChatInfo = { SendAddonMessage = function() return 0 end } SendAddonMessage = function() return "old" end';
    expect(compat(modernAndOld, 'SendAddonMessage("VXV", "x", "GUILD")')).toEqual([true, 0]);
    expect(compat('SendAddonMessage = function() return "old" end', 'SendAddonMessage("VXV", "x", "GUILD")')).toEqual([
      true,
      "old",
    ]);
  });

  it('answers "API absente" instead of a Lua error when the client has none', () => {
    expect(compat("", "GetGuildInfo('player')")).toEqual([false, "API absente"]);
  });

  it("turns an error inside the client function into a refusal", () => {
    const failing = 'C_GuildInfo = { GuildRoster = function() error("throttled") end }';
    expect(compat(failing, "RequestGuildRoster()")).toEqual([false, expect.stringContaining("throttled")]);
  });
});

describe("Names", () => {
  const units = `GetUnitName = function(unit)
      return ({ player = "Ðéjà Vu", target = SECRET })[unit]
    end`;
  const names = (call: string) => {
    const { core } = startCore();
    core.run(units);
    return core.run(`local _, ns = ... return { ns.Names.${call} }`);
  };

  it("gives the full name of a unit, never a secret one", () => {
    expect(names('OfUnit("player")')).toEqual(["Ðéjà Vu"]);
    expect(names('OfUnit("target")')).toEqual({});
    expect(names('OfUnit("party1")')).toEqual({});
  });

  it("splits first and last name, and refuses a name without last name", () => {
    expect(names('Split("Ðéjà Vu")')).toEqual(["Ðéjà", "Vu"]);
    expect(names('Split("Marie")')).toEqual({});
  });
});
