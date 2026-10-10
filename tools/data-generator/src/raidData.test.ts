import { readFile } from "node:fs/promises";
import { loadRaids } from "@vxv/raid-data";
import { evaluateLua } from "@vxv/lua/testing";
import { describe, expect, it } from "vitest";
import { RAID_DATA_GLOBAL, RAID_DATA_PATH, renderRaidData } from "./raidData.ts";
import { onyxia, salleDesThanes } from "./test/raids.ts";

const REPOSITORY = new URL("../../../", import.meta.url);

describe("renderRaidData", () => {
  const data = renderRaidData([onyxia, salleDesThanes]);

  it("writes one file of the addon, listed in its .toc", () => {
    expect(data.path).toBe("addon/VXV/Data/Raids.lua");
  });

  it("registers each raid in the shared global table, identical to the source data", () => {
    for (const { id, ...expected } of [onyxia, salleDesThanes]) {
      expect(evaluateLua(data.content, `${RAID_DATA_GLOBAL}["${id}"]`)).toEqual(expected);
    }
  });

  it("is current in the repository: npm run generate after any change of data/raids", async () => {
    const committed = await readFile(new URL(RAID_DATA_PATH, REPOSITORY), "utf8");
    expect(committed).toBe(renderRaidData(await loadRaids()).content);
  });
});
