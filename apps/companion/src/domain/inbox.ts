import { toLuaLiteral } from "@vxv/lua";

/** Where the companion writes for the addon, in a version of the game: the VXV_Sync bundle's inbox. */
export const SYNC_BUNDLE = ["Interface", "AddOns", "VXV_Sync"];
export const INBOX_FILE = ["External", "Inbox.lua"];

/** Format of the inbox, read by addon/VXV_Sync/Inbox.lua: a newer one makes the addon ask for its update. */
export const INBOX_VERSION = 1;

const MS_PER_SECOND = 1000;

/** What the companion brings to the game at a synchronisation. */
export interface Inbox {
  /** The next event as VXV-RAID text, as an officer would paste it; none when no event is planned. */
  raid: string | undefined;
  /** The bets as VXV-PARIS text (P11.8), for VXV_Paris; none from a website without bets. */
  paris: string | undefined;
  writtenAt: Date;
}

/**
 * The inbox as the Lua file the game reads at /reload (contract with addon/VXV_Sync/Inbox.lua). It goes into the
 * bundle's private namespace: no global.
 */
export function renderInbox({ raid, paris, writtenAt }: Inbox): string {
  const inbox = {
    version: INBOX_VERSION,
    writtenAt: Math.floor(writtenAt.getTime() / MS_PER_SECOND),
    ...(raid === undefined ? {} : { raid }),
    ...(paris === undefined ? {} : { paris }),
  };
  return [
    "-- Written by the VXV companion at each synchronisation: do not edit, the next one replaces it.",
    "local _, ns = ...",
    `ns.Inbox = ${toLuaLiteral(inbox)}`,
    "",
  ].join("\n");
}
