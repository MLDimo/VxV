import type { CompanionState } from "../application/companion.ts";

/** What the window may ask of the companion: exposed by the preload script as window.vxv. */
export interface CompanionBridge {
  state(): Promise<CompanionState>;
  onState(listener: (state: CompanionState) => void): void;
  link(): Promise<void>;
  cancelLink(): Promise<void>;
  unlink(): Promise<void>;
  chooseGameFolder(): Promise<void>;
  setLaunchAtLogin(on: boolean): Promise<void>;
  openSite(): Promise<void>;
}

/** The player's actions, by name, with their arguments. */
export type Action = Exclude<keyof CompanionBridge, "state" | "onState">;

export const CHANNELS = { state: "vxv:state", changed: "vxv:changed", action: "vxv:action" } as const;
