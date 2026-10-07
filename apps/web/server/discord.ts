import "server-only";
import { identityFromDiscordUser, type DiscordUser } from "@vxv/server";
import { Discord } from "arctic";
import { getConfig } from "./config";
import type { DiscordGuildMember } from "./discordSignIn";

const DISCORD_API = "https://discord.com/api/v10";
const HTTP_NOT_FOUND = 404;

/** identify: who the user is; guilds.members.read: their roles on the guild server. */
export const DISCORD_SCOPES = ["identify", "guilds.members.read"];

const SIGN_IN_CALLBACK_PATH = "/connexion/discord/retour";

export function createDiscordClient(origin: string): Discord {
  const { clientId, clientSecret } = getConfig().discord;
  return new Discord(clientId, clientSecret, new URL(SIGN_IN_CALLBACK_PATH, origin).toString());
}

interface GuildMemberResponse {
  user: DiscordUser;
  roles: string[];
}

export async function fetchGuildMember(accessToken: string): Promise<DiscordGuildMember | undefined> {
  const response = await fetch(`${DISCORD_API}/users/@me/guilds/${getConfig().discord.guildId}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === HTTP_NOT_FOUND) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`Discord guild member request failed: ${response.status}`);
  }
  const member = (await response.json()) as GuildMemberResponse;
  return { identity: identityFromDiscordUser(member.user), roleIds: member.roles };
}
