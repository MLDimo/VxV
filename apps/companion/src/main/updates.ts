import { app, shell } from "electron";
import electronUpdater from "electron-updater";
import type { UpdateNotice } from "../application/ports.ts";

/** Where every version of the companion is published (the public repository of its releases). */
export const RELEASES_PAGE = "https://github.com/MLDimo/vxv-compagnon/releases/latest";
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

const { autoUpdater } = electronUpdater;

/**
 * Keeps the installed companion up to date (P7.1), from the releases' repository. Windows downloads the new version
 * and installs it when the companion quits, or at once on the player's click. Without a certificate, a Mac cannot
 * replace the app by itself: the companion tells the player, who downloads it.
 */
export function watchUpdates(announce: (notice: UpdateNotice) => void): void {
  if (!app.isPackaged) {
    return;
  }
  const mac = process.platform === "darwin";
  autoUpdater.autoDownload = !mac;
  autoUpdater.autoInstallOnAppQuit = !mac;
  autoUpdater.on("update-available", (info) => {
    if (mac) {
      announce({ version: info.version, ready: false });
    }
  });
  autoUpdater.on("update-downloaded", (info) => announce({ version: info.version, ready: true }));
  autoUpdater.on("error", (error) => console.error("Companion update failed", error));
  const check = () => void autoUpdater.checkForUpdates().catch(() => undefined);
  check();
  setInterval(check, CHECK_EVERY_MS);
}

/** The player's click on the update: installs it when downloaded, else opens the page of the releases. */
export function applyUpdate(notice: UpdateNotice | undefined): void {
  if (notice?.ready === true) {
    autoUpdater.quitAndInstall();
  } else {
    void shell.openExternal(RELEASES_PAGE);
  }
}
