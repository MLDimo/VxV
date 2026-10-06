import { evaluateLua } from "@vxv/lua/testing";
import { describe, expect, it } from "vitest";
import { renderInbox } from "./inbox.ts";

/** Runs the file as the game does: with the bundle's name and private namespace, then reads ns.Inbox. */
function readInGame(source: string): unknown {
  return evaluateLua(`local ns = {};\n(function(...)\n${source}\nend)("VXV_Sync", ns)\nInbox = ns.Inbox`, "Inbox");
}

describe("inbox for the addon", () => {
  it("carries the next event and the bets as the addon reads them, accents and line breaks included", () => {
    const raid = "VXV-RAID-2\nE;e1;1796932800;1796931900;2;Onyxia\nO;Ðéjà Vu";
    const paris = "VXV-PARIS-1\nP;1796931900\nO;Ðéjà Vu";
    expect(readInGame(renderInbox({ raid, paris, writtenAt: new Date("2026-12-10T19:45:00Z") }))).toEqual({
      version: 1,
      writtenAt: 1796931900,
      raid,
      paris,
    });
  });

  it("says when no event is planned, without any global", () => {
    const source = renderInbox({ raid: undefined, paris: undefined, writtenAt: new Date("2026-12-10T19:45:00Z") });
    expect(readInGame(source)).toEqual({ version: 1, writtenAt: 1796931900 });
    expect(source).toContain("local _, ns = ...");
  });
});
