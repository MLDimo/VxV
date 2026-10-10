import { toLuaLiteral, type LuaValue } from "@vxv/lua";

const INBOX_FILE = "VXV/Sync/External/Inbox.lua";

/**
 * The files the companion writes on the player's computer (apps/companion/src/domain/inbox.ts): its inbox for
 * the Sync part, holding the next event as VXV-RAID text.
 */
export function companionFiles(inbox: { [key: string]: LuaValue }): Record<string, string> {
  return {
    [INBOX_FILE]: `local ns = select(2, ...).Sync\nns.Inbox = ${toLuaLiteral({ version: 1, writtenAt: 1796903000, ...inbox })}\n`,
  };
}
