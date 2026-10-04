import { describe, expect, it } from "vitest";
import { luacheckRules } from "../conventions.ts";
import { startCore } from "../core.ts";
import { FOREVER_EVENTS } from "../forever.ts";

describe("VXV_Core foundation", () => {
  describe("saved data", () => {
    it("starts empty at the first installation, with the current schema", () => {
      const { client } = startCore({ beforeLogin: true });
      expect(client("return VXV_DB")).toEqual({ schemaVersion: 2, modules: {}, ui: {} });
    });

    it("upgrades data saved before any schema, keeping it", () => {
      const { client } = startCore({ savedVariables: '{ note = "gardée" }', beforeLogin: true });
      expect(client("return VXV_DB")).toEqual({ schemaVersion: 2, modules: {}, ui: {}, note: "gardée" });
    });

    it("upgrades the data of the previous schema step by step, keeping the modules' data", () => {
      const { client } = startCore({
        savedVariables: "{ schemaVersion = 1, modules = { raid = { x = 1 } } }",
        beforeLogin: true,
      });
      expect(client("return VXV_DB")).toEqual({ schemaVersion: 2, modules: { raid: { x: 1 } }, ui: {} });
    });

    it("leaves untouched the data of a newer version of the addon", () => {
      const { client } = startCore({
        savedVariables: "{ schemaVersion = 7, modules = { raid = { x = 1 } } }",
        beforeLogin: true,
      });
      expect(client("return VXV_DB")).toEqual({ schemaVersion: 7, modules: { raid: { x: 1 } } });
    });
  });

  describe("modules", () => {
    it("enables the modules at login, in order, each with its saved data", () => {
      const { core, client } = startCore({ beforeLogin: true });
      core.run(`
        Enabled = {}
        VXV.RegisterModule({ id = "raid", Enable = function(data) data.seen = true; Enabled[#Enabled + 1] = "raid" end })
        VXV.RegisterModule({ id = "paris", Enable = function() Enabled[#Enabled + 1] = "paris" end })
      `);
      expect(client("return #Enabled")).toBe(0);
      client('Fire("PLAYER_LOGIN")');
      expect(client("return Enabled")).toEqual(["raid", "paris"]);
      expect(client("return VXV_DB.modules.raid")).toEqual({ seen: true });
    });

    it("enables at once a module registered after login, as a bundle loaded on demand", () => {
      const { core, client } = startCore();
      core.run('VXV.RegisterModule({ id = "late", Enable = function() Late = true end })');
      expect(client("return Late")).toBe(true);
    });

    it("keeps enabling the others when one module fails, reporting the error to BugSack", () => {
      const { core, client, errors } = startCore({ beforeLogin: true });
      core.run(`
        VXV.RegisterModule({ id = "broken", Enable = function() error("boom") end })
        VXV.RegisterModule({ id = "fine", Enable = function() Fine = true end })
      `);
      client('Fire("PLAYER_LOGIN")');
      expect(client("return Fine")).toBe(true);
      expect(errors()).toEqual([expect.stringContaining("boom")]);
    });

    it("refuses a module without id, or registered twice", () => {
      const { core } = startCore();
      expect(() => core.run("VXV.RegisterModule({})")).toThrow(/invalid or duplicate module id/);
      core.run('VXV.RegisterModule({ id = "raid" })');
      expect(() => core.run('VXV.RegisterModule({ id = "raid" })')).toThrow(/invalid or duplicate module id/);
    });
  });

  it("delivers internal events to every listener, isolating a failing one", () => {
    const { core, errors } = startCore();
    const received = core.run(`
      local received = {}
      VXV.On("signup", function() error("broken listener") end)
      VXV.On("signup", function(name) received[#received + 1] = name end)
      VXV.Emit("signup", "Ðéjà Vu")
      return received
    `);
    expect(received).toEqual(["Ðéjà Vu"]);
    expect(errors()).toEqual([expect.stringContaining("broken listener")]);
  });

  it("only registers game events seen on WoW Forever, and only creates the globals of .luacheckrc", () => {
    const { registeredEvents, newGlobals } = startCore();
    expect(registeredEvents().filter((event) => !FOREVER_EVENTS.has(event))).toEqual([]);
    const { allowedGlobals } = luacheckRules();
    expect(newGlobals().filter((name) => !allowedGlobals.has(name))).toEqual([]);
  });
});
