import { toLuaLiteral, type LuaValue } from "@vxv/lua";

const INBOX_FILE = "VXV_Sync/External/Inbox.lua";

/**
 * The files the companion writes on the player's computer (apps/companion/src/domain/inbox.ts): its inbox for
 * VXV_Sync, holding the next event as VXV-RAID text.
 */
export function companionFiles(inbox: { [key: string]: LuaValue }): Record<string, string> {
  return {
    [INBOX_FILE]: `local _, ns = ...\nns.Inbox = ${toLuaLiteral({ version: 1, writtenAt: 1796903000, ...inbox })}\n`,
  };
}
