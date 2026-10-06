import { evaluateLua } from "@vxv/lua/testing";
import { describe, expect, it } from "vitest";
import { bundleTexts, renderInbox } from "./inbox.ts";

/** Runs the file as the game does: with the bundle's name and private namespace, then reads ns.Inbox. */
function readInGame(source: string): unknown {
  return evaluateLua(`local ns = {};\n(function(...)\n${source}\nend)("VXV_Sync", ns)\nInbox = ns.Inbox`, "Inbox");
}

describe("inbox for the addon", () => {
  it("carries the next event and each bundle's data as the addon reads them, accents and line breaks included", () => {
    const raid = "VXV-RAID-2\nE;e1;1796932800;1796931900;2;Onyxia\nO;Ðéjà Vu";
    const paris = "VXV-PARIS-1\nP;1796931900\nO;Ðéjà Vu";
    const titres = "VXV-TITRES-1\nP;1796931900\nO;Ðéjà Vu";
    const writtenAt = new Date("2026-12-10T19:45:00Z");
    expect(readInGame(renderInbox({ raid, bundles: { paris, titres }, writtenAt }))).toEqual({
      version: 1,
      writtenAt: 1796931900,
      raid,
      paris,
      titres,
    });
  });

  it("says when no event is planned, without any global", () => {
    const source = renderInbox({ raid: undefined, bundles: {}, writtenAt: new Date("2026-12-10T19:45:00Z") });
    expect(readInGame(source)).toEqual({ version: 1, writtenAt: 1796931900 });
    expect(source).toContain("local _, ns = ...");
  });

  it("takes each bundle's text the website brought, even one newer than the companion, and nothing else", () => {
    expect(
      bundleTexts({
        raid: { text: "VXV-RAID-2" },
        paris: { text: "VXV-PARIS-1" },
        artisans: { text: "VXV-ARTISANS-1" },
        version: { text: "2" },
        writtenAt: { text: "x" },
        quetes: null,
        titres: { text: 3 },
      }),
    ).toEqual({ paris: "VXV-PARIS-1", artisans: "VXV-ARTISANS-1" });
  });
});
