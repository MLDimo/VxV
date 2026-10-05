/** The disk as the search for the game needs it; any folder that cannot be read counts as empty. */
export interface FolderReader {
  /** Names of the sub-folders; none when the folder does not exist. */
  subfolders(path: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
  join(...parts: string[]): string;
}

/** Where the computer may keep the game: the platform, the user's home, and its drives or volumes. */
export interface Computer {
  platform: string;
  home: string;
  /** Windows: drive roots ("C:\\"); Mac: mounted volumes ("/Volumes/T7"). */
  roots: readonly string[];
}

const GAME_FOLDER = "World of Warcraft";
/** One folder per version of the game, such as _retail_ or _classic_beta_. */
const VERSION_FOLDER = /^_[a-z_]+_$/;
const ADDON_TOC = ["Interface", "AddOns", "VXV_Core", "VXV_Core.toc"];
/** Usual places of the game's folder under a Windows drive. */
const WINDOWS_PARENTS = ["Program Files (x86)", "Program Files", "", "Games", "Jeux", "Battle.net"];
/** And under a Mac volume. */
const MAC_PARENTS = ["Applications", ""];

/** The usual folders of the game on this computer, the most common first. */
export function usualGameFolders(computer: Computer, join: FolderReader["join"]): string[] {
  if (computer.platform === "win32") {
    return computer.roots.flatMap((root) => WINDOWS_PARENTS.map((parent) => join(root, parent, GAME_FOLDER)));
  }
  if (computer.platform === "darwin") {
    return [
      join("/Applications", GAME_FOLDER),
      join(computer.home, "Applications", GAME_FOLDER),
      ...computer.roots.flatMap((root) => MAC_PARENTS.map((parent) => join(root, parent, GAME_FOLDER))),
    ];
  }
  return [];
}

/**
 * The versions of the game where the VXV addon is installed, under these folders: each may be the game's folder,
 * holding one folder per version, or a version's folder itself. Each version once, in the order found.
 */
export async function findInstallations(folders: readonly string[], reader: FolderReader): Promise<string[]> {
  const hasAddon = (version: string) => reader.exists(reader.join(version, ...ADDON_TOC));
  const found: string[] = [];
  for (const folder of folders) {
    const versions = (await reader.subfolders(folder))
      .filter((name) => VERSION_FOLDER.test(name))
      .map((name) => reader.join(folder, name));
    for (const version of [folder, ...versions]) {
      if (!found.includes(version) && (await hasAddon(version))) {
        found.push(version);
      }
    }
  }
  return found;
}
