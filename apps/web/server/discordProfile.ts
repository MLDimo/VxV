import "server-only";
import type { Member } from "@vxv/server";
import { getApplication } from "./application";

/** After the main changes on the website: the member's Discord nickname and class role follow. */
export function syncDiscordProfile(member: Member): Promise<string> {
  return getApplication().discordProfiles.syncForMessage(member);
}
