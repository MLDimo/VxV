import { toLuaLiteral } from "@vxv/lua";
import { ADDON_FOLDER } from "./installations.ts";

/** Where the companion writes for the addon, in a version of the game: the inbox of its Sync part. */
export const INBOX_FILE = [...ADDON_FOLDER, "Sync", "External", "Inbox.lua"];

/** Format of the inbox, read by addon/VXV/Sync/Companion.lua: a newer one makes the addon ask for its update. */
const INBOX_VERSION = 1;

const MS_PER_SECOND = 1000;

/** What the companion brings to the game at a synchronisation. */
interface Inbox {
  /** The next event as VXV-RAID text, as an officer would paste it; none when no event is planned. */
  raid: string | undefined;
  /** Each bundle's data by the inbox field it reads: paris (VXV-PARIS), quetes (VXV-QUETES), titres (VXV-TITRES)… */
  bundles: Readonly<Record<string, string>>;
  writtenAt: Date;
}

// A bundle's field: a lowercase name, other than the inbox's own.
const BUNDLE_FIELD = /^[a-z]+$/;
const OWN_FIELDS = new Set(["version", "raid"]);

/**
 * Each bundle's data the website brought (apps/web/app/api/compagnon/donnees), by field: any lowercase name holding
 * { text }. The fields a newer website adds reach the addon without any update of the companion.
 */
export function bundleTexts(download: Readonly<Record<string, unknown>>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(download).flatMap(([field, value]) => {
      const text = typeof value === "object" && value !== null && "text" in value ? value.text : undefined;
      return BUNDLE_FIELD.test(field) && !OWN_FIELDS.has(field) && typeof text === "string" ? [[field, text]] : [];
    }),
  );
}

/**
 * The inbox as the Lua file the game reads at /reload (contract with addon/VXV/Sync/Companion.lua). It goes into the
 * Sync part's private namespace: no global.
 */
export function renderInbox({ raid, bundles, writtenAt }: Inbox): string {
  const inbox = {
    ...bundles,
    version: INBOX_VERSION,
    writtenAt: Math.floor(writtenAt.getTime() / MS_PER_SECOND),
    ...(raid === undefined ? {} : { raid }),
  };
  return [
    "-- Written by the VXV companion at each synchronisation: do not edit, the next one replaces it.",
    "local ns = select(2, ...).Sync",
    `ns.Inbox = ${toLuaLiteral(inbox)}`,
    "",
  ].join("\n");
}
