import { describe, expect, it } from "vitest";
import { parseRaids, RaidDataError, type RaidSource } from "./parseRaids.ts";
import type { RaidFile } from "./schema.ts";

function raidFile(overrides: Partial<RaidFile> = {}): RaidFile {
  return {
    name: "Onyxia",
    instanceId: 249,
    bosses: [{ encounterId: 1084, name: "Onyxia", loot: [{ itemId: 18423, name: "Tête d'Onyxia" }] }],
    ...overrides,
  };
}

function source(fileName: string, content: unknown): RaidSource {
  return { fileName, content: typeof content === "string" ? content : JSON.stringify(content) };
}

function issuesOf(sources: RaidSource[]): readonly string[] {
  try {
    parseRaids(sources);
  } catch (error) {
    if (error instanceof RaidDataError) {
      return error.issues;
    }
    throw error;
  }
  throw new Error("expected parseRaids to reject the sources");
}

describe("parseRaids", () => {
  it("returns a valid raid with its id taken from the file name", () => {
    expect(parseRaids([source("onyxia.json", raidFile())])).toEqual([{ id: "onyxia", ...raidFile() }]);
  });

  it("sorts raids by id", () => {
    const hyjal = raidFile({
      name: "Mont Hyjal",
      instanceId: 534,
      bosses: [{ encounterId: 618, name: "Rage Winterchill", loot: [{ itemId: 30871, name: "Brassards" }] }],
    });
    const raids = parseRaids([source("onyxia.json", raidFile()), source("mont-hyjal.json", hyjal)]);
    expect(raids.map((raid) => raid.id)).toEqual(["mont-hyjal", "onyxia"]);
  });

  it("keeps bosses in the file order, which is the kill order", () => {
    const bosses = [
      { encounterId: 2, name: "Second", loot: [{ itemId: 2, name: "B" }] },
      { encounterId: 1, name: "First", loot: [{ itemId: 1, name: "A" }] },
    ];
    const [raid] = parseRaids([source("onyxia.json", raidFile({ bosses }))]);
    expect(raid?.bosses.map((boss) => boss.encounterId)).toEqual([2, 1]);
  });

  it.each(["Onyxia.json", "mont hyjal.json", "mont_hyjal.json", "-onyxia.json"])("rejects the file name %s", (name) => {
    expect(issuesOf([source(name, raidFile())])).toEqual([expect.stringContaining("file name must be lowercase")]);
  });

  it("rejects invalid JSON", () => {
    expect(issuesOf([source("onyxia.json", "{ name: ")])).toEqual([expect.stringContaining("invalid JSON")]);
  });

  it.each([
    ["an unknown key", { ...raidFile(), size: 40 }],
    ["a missing name", { ...raidFile(), name: "  " }],
    ["a negative instance id", raidFile({ instanceId: -1 })],
    ["a raid without bosses", raidFile({ bosses: [] })],
    ["a boss without loot", raidFile({ bosses: [{ encounterId: 1084, name: "Onyxia", loot: [] }] })],
  ])("rejects %s", (_case, content) => {
    expect(issuesOf([source("onyxia.json", content)])).toEqual([expect.stringMatching(/^onyxia\.json: /)]);
  });

  it("rejects an encounter used by two raids", () => {
    const issues = issuesOf([source("onyxia.json", raidFile()), source("copy.json", raidFile({ instanceId: 1 }))]);
    expect(issues).toEqual(["encounterId 1084 is used by several bosses"]);
  });

  it("rejects an instance used by two raids", () => {
    const other = raidFile({
      bosses: [{ encounterId: 1, name: "Other", loot: [{ itemId: 1, name: "A" }] }],
    });
    expect(issuesOf([source("onyxia.json", raidFile()), source("other.json", other)])).toEqual([
      "instanceId 249 is used by several raids",
    ]);
  });

  it("rejects an item listed twice for the same boss", () => {
    const loot = [
      { itemId: 18423, name: "Tête d'Onyxia" },
      { itemId: 18423, name: "Tête d'Onyxia" },
    ];
    const content = raidFile({ bosses: [{ encounterId: 1084, name: "Onyxia", loot }] });
    expect(issuesOf([source("onyxia.json", content)])).toEqual(["onyxia.json: item 18423 is listed twice for Onyxia"]);
  });

  it("rejects an item with two different names", () => {
    const bosses = [
      { encounterId: 1, name: "A", loot: [{ itemId: 7, name: "Épée" }] },
      { encounterId: 2, name: "B", loot: [{ itemId: 7, name: "Hache" }] },
    ];
    expect(issuesOf([source("onyxia.json", raidFile({ bosses }))])).toEqual([
      'item 7 has two names: "Épée" and "Hache"',
    ]);
  });

  it("reports the issues of every file at once", () => {
    const issues = issuesOf([source("Bad.json", raidFile()), source("onyxia.json", "not json")]);
    expect(issues).toHaveLength(2);
  });
});
