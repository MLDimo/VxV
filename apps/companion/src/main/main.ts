import { join } from "node:path";
import { COLORS } from "@vxv/design";
import { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage, shell, Tray, type IpcMainInvokeEvent } from "electron";
import { createCompanion, type Companion } from "../application/companion.ts";
import { diskGameFiles, diskReader, thisComputer } from "../infrastructure/disk.ts";
import { listenForReturn } from "../infrastructure/loopback.ts";
import { createSiteApi } from "../infrastructure/siteApi.ts";
import { createSettingsFile, createTokenFile } from "../infrastructure/storage.ts";
import { CHANNELS, type Action } from "./bridge.ts";

/** The website the companion works with; another one for development (VXV_SITE_URL=http://localhost:3000). */
const SITE_URL = process.env.VXV_SITE_URL ?? "https://vxv-web.vercel.app";
/** Given to the system for the launch at login: the companion then starts hidden in the notification area. */
const HIDDEN_ARGUMENT = "--cache";
const WINDOW_SIZE = { width: 440, height: 720 };
const RENDERER = join(__dirname, "renderer", "index.html");

let mainWindow: BrowserWindow | undefined;
// Kept referenced: a collected tray icon disappears from the notification area.
let tray: Tray | undefined;
let quitting = false;

function createWindow(): BrowserWindow {
  const created = new BrowserWindow({
    ...WINDOW_SIZE,
    resizable: false,
    show: false,
    title: "VXV · Compagnon",
    backgroundColor: COLORS.night,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  void created.loadFile(RENDERER);
  created.once("ready-to-show", () => created.show());
  // Closing the window keeps the companion running in the notification area.
  created.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      created.hide();
    }
  });
  // Nothing opens or navigates inside the companion: the website opens in the browser.
  created.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  created.webContents.on("will-navigate", (event) => event.preventDefault());
  return created;
}

function showWindow(): void {
  mainWindow ??= createWindow();
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

function createTray(): Tray {
  const created = new Tray(join(__dirname, "assets", "tray.png"));
  created.setToolTip("VXV · Compagnon");
  created.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Ouvrir le compagnon", click: showWindow },
      { label: "Ouvrir le site VXV", click: () => void shell.openExternal(SITE_URL) },
      { type: "separator" },
      { label: "Quitter", click: () => app.quit() },
    ]),
  );
  created.on("click", showWindow);
  return created;
}

/** The actions the window may ask for; anything else is ignored. */
function actions(companion: Companion): Record<Action, (...args: unknown[]) => Promise<void>> {
  return {
    link: async () => {
      await companion.link();
      showWindow();
    },
    cancelLink: async () => companion.cancelLink(),
    unlink: () => companion.unlink(),
    chooseGameFolder: async () => {
      const options = { title: "Dossier de World of Warcraft", properties: ["openDirectory" as const] };
      const choice = mainWindow
        ? await dialog.showOpenDialog(mainWindow, options)
        : await dialog.showOpenDialog(options);
      const [folder] = choice.filePaths;
      if (!choice.canceled && folder !== undefined) {
        await companion.chooseGameFolder(folder);
      }
    },
    setLaunchAtLogin: (on) => companion.setLaunchAtLogin(on === true),
    syncNow: () => companion.syncNow(),
    openSite: () => shell.openExternal(SITE_URL),
  };
}

/** Only the companion's own page talks to it. */
function fromRenderer(event: IpcMainInvokeEvent): boolean {
  return event.senderFrame?.url.startsWith("file://") === true;
}

function connect(companion: Companion): void {
  const handlers = actions(companion);
  ipcMain.handle(CHANNELS.state, (event) => (fromRenderer(event) ? companion.state() : undefined));
  ipcMain.handle(CHANNELS.action, async (event, action: unknown, ...args: unknown[]) => {
    const handler = typeof action === "string" ? handlers[action as Action] : undefined;
    if (fromRenderer(event) && handler !== undefined) {
      await handler(...args);
    }
  });
  companion.onChange((state) => mainWindow?.webContents.send(CHANNELS.changed, state));
}

async function start(): Promise<void> {
  const userData = app.getPath("userData");
  const companion = createCompanion({
    site: createSiteApi(SITE_URL),
    tokens: createTokenFile(join(userData, "jeton"), safeStorage),
    settings: createSettingsFile(join(userData, "reglages.json")),
    folders: diskReader,
    gameFiles: diskGameFiles,
    computer: thisComputer,
    listen: listenForReturn,
    openBrowser: (url) => shell.openExternal(url),
    // Only an installed companion registers itself; a development build would register Electron itself.
    applyLaunchAtLogin: (on) => {
      if (app.isPackaged) {
        app.setLoginItemSettings({ openAtLogin: on, args: [HIDDEN_ARGUMENT] });
      }
    },
    version: app.getVersion(),
  });
  connect(companion);
  app.on("will-quit", companion.stop);
  tray ??= createTray();
  const startedHidden = process.argv.includes(HIDDEN_ARGUMENT) || app.getLoginItemSettings().wasOpenedAtLogin;
  if (!startedHidden) {
    showWindow();
  }
  await companion.start();
}

// One companion per computer: launching it again shows the running one.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", showWindow);
  app.on("activate", showWindow);
  app.on("before-quit", () => {
    quitting = true;
  });
  // The companion lives in the notification area: closing its window does not end it.
  app.on("window-all-closed", () => undefined);
  void app.whenReady().then(start);
}
