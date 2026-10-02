import { describe, expect, it } from "vitest";
import { ADDON_INTERFACE, packFolderName, RAID_DATA_GLOBAL, renderLuaPack } from "./luaPack.ts";
import { evaluateLua } from "./test/evaluateLua.ts";
import { onyxia, salleDesThanes } from "./test/raids.ts";

describe("packFolderName", () => {
  it.each([
    ["onyxia", "VXV_Data_Onyxia"],
    ["salle-des-thanes", "VXV_Data_SalleDesThanes"],
    ["mont-hyjal", "VXV_Data_MontHyjal"],
  ])("names the pack of %s %s", (raidId, folder) => {
    expect(packFolderName(raidId)).toBe(folder);
  });
});

describe("renderLuaPack", () => {
  const [toc, data] = renderLuaPack(salleDesThanes);

  it("writes a .toc and a data file in the pack folder", () => {
    expect([toc?.path, data?.path]).toEqual([
      "addon/VXV_Data_SalleDesThanes/VXV_Data_SalleDesThanes.toc",
      "addon/VXV_Data_SalleDesThanes/Data.lua",
    ]);
  });

  it("declares the Forever interface, a version filled by the packager and the data file", () => {
    const lines = toc?.content.split("\n") ?? [];
    expect(lines).toContain(`## Interface: ${ADDON_INTERFACE}`);
    expect(lines).toContain("## Title: VXV Data - La salle des Thanes");
    expect(lines).toContain("## Version: @project-version@");
    expect(lines).toContain("Data.lua");
  });

  it("registers the raid in the shared global table, identical to the source data", () => {
    const { id, ...expected } = salleDesThanes;
    expect(evaluateLua(data?.content ?? "", `${RAID_DATA_GLOBAL}["${id}"]`)).toEqual(expected);
  });

  it("lets several packs share the global table", () => {
    const chunks = [onyxia, salleDesThanes].map((raid) => renderLuaPack(raid)[1]?.content ?? "").join("\n");
    expect(evaluateLua(chunks, `${RAID_DATA_GLOBAL}["onyxia"].name`)).toBe("Repaire d'Onyxia");
    expect(evaluateLua(chunks, `${RAID_DATA_GLOBAL}["salle-des-thanes"].instanceId`)).toBe(3065);
  });
});
