import { contextBridge, ipcRenderer } from "electron";
import type { CompanionState } from "../application/companion.ts";
import { CHANNELS, type Action, type CompanionBridge } from "./bridge.ts";

/** The window's only way to the companion: named actions, no access to Node nor to Electron. */
const act = (action: Action, ...args: unknown[]): Promise<void> => ipcRenderer.invoke(CHANNELS.action, action, ...args);

const bridge: CompanionBridge = {
  state: () => ipcRenderer.invoke(CHANNELS.state) as Promise<CompanionState>,
  onState: (listener) => {
    ipcRenderer.on(CHANNELS.changed, (_event, state: CompanionState) => listener(state));
  },
  link: () => act("link"),
  cancelLink: () => act("cancelLink"),
  unlink: () => act("unlink"),
  chooseGameFolder: () => act("chooseGameFolder"),
  setLaunchAtLogin: (on) => act("setLaunchAtLogin", on),
  syncNow: () => act("syncNow"),
  openSite: () => act("openSite"),
};

contextBridge.exposeInMainWorld("vxv", bridge);
