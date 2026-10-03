import type { DiscordIdentity } from "../../application/ports.ts";

/** A Discord user as the API returns it, in OAuth answers and in interactions alike. */
export interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
}

/** The name shown on Discord: the display name when the user set one, else the username. */
export function identityFromDiscordUser(user: DiscordUser): DiscordIdentity {
  return { discordId: user.id, discordName: user.global_name ?? user.username };
}
