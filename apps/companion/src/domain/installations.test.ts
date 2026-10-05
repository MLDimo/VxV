import { posix, win32 } from "node:path";
import { describe, expect, it } from "vitest";
import { findInstallations, usualGameFolders, type FolderReader } from "./installations.ts";

/** A disk holding these files, on a Mac. */
function disk(...files: string[]): FolderReader {
  return {
    join: posix.join,
    exists: async (path) => files.some((file) => file === path || file.startsWith(`${path}/`)),
    subfolders: async (path) => [
      ...new Set(
        files
          .filter((file) => file.startsWith(`${path}/`))
          .map((file) => file.slice(path.length + 1).split("/"))
          .filter((parts) => parts.length > 1)
          .map((parts) => parts[0] ?? ""),
      ),
    ],
  };
}

const TOC = "Interface/AddOns/VXV_Core/VXV_Core.toc";

describe("game installations", () => {
  it("lists the usual folders of the game on Windows, drive by drive", () => {
    const folders = usualGameFolders(
      { platform: "win32", home: "C:\\Users\\Martin", roots: ["C:\\", "D:\\"] },
      win32.join,
    );
    expect(folders[0]).toBe("C:\\Program Files (x86)\\World of Warcraft");
    expect(folders).toContain("D:\\World of Warcraft");
    expect(folders).toContain("D:\\Jeux\\World of Warcraft");
  });

  it("lists the usual folders on a Mac, external volumes included", () => {
    const folders = usualGameFolders({ platform: "darwin", home: "/Users/martin", roots: ["/Volumes/T7"] }, posix.join);
    expect(folders).toEqual([
      "/Applications/World of Warcraft",
      "/Users/martin/Applications/World of Warcraft",
      "/Volumes/T7/Applications/World of Warcraft",
      "/Volumes/T7/World of Warcraft",
    ]);
  });

  it("keeps the versions of the game where VXV is installed", async () => {
    const reader = disk(
      `/Volumes/T7/World of Warcraft/_classic_beta_/${TOC}`,
      "/Volumes/T7/World of Warcraft/_retail_/Interface/AddOns/Other/Other.toc",
      "/Volumes/T7/World of Warcraft/Data/data.000",
    );
    expect(
      await findInstallations(["/Applications/World of Warcraft", "/Volumes/T7/World of Warcraft"], reader),
    ).toEqual(["/Volumes/T7/World of Warcraft/_classic_beta_"]);
  });

  it("accepts a version's folder chosen by the player, and lists each version once", async () => {
    const reader = disk(`/Games/WoW/_classic_/${TOC}`, `/Games/WoW/_classic_beta_/${TOC}`);
    expect(await findInstallations(["/Games/WoW/_classic_", "/Games/WoW"], reader)).toEqual([
      "/Games/WoW/_classic_",
      "/Games/WoW/_classic_beta_",
    ]);
  });
});
