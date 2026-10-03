import "server-only";
import type { DiscordRoleMapping } from "@vxv/server";
import { z } from "zod";

const discordId = z.string().regex(/^\d+$/, "doit être un identifiant Discord (chiffres)");
const discordPublicKey = z.string().regex(/^[0-9a-f]{64}$/i, "doit être la clé publique Discord (64 caractères)");

const environmentSchema = z.object({
  DATABASE_URL: z.url(),
  SITE_URL: z.url(),
  DISCORD_CLIENT_ID: discordId,
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_PUBLIC_KEY: discordPublicKey,
  DISCORD_BOT_TOKEN: z.string().min(1),
  // Only the end-to-end tests point the bot to a fake Discord.
  DISCORD_API_URL: z.url().optional(),
  DISCORD_GUILD_ID: discordId,
  DISCORD_LINK_CHANNEL_ID: discordId,
  DISCORD_RAID_CHANNEL_ID: discordId,
  DISCORD_ROLE_TREASURER: discordId,
  DISCORD_ROLE_OFFICER: discordId,
  DISCORD_ROLE_GM: discordId,
});

export interface WebConfig {
  databaseUrl: string;
  /** Public address of the website, for the links in the bot's messages. */
  siteUrl: string;
  discord: {
    clientId: string;
    clientSecret: string;
    /** Verifies that interactions come from Discord. */
    publicKey: string;
    botToken: string;
    apiUrl: string | undefined;
    guildId: string;
    /** Channel where members link their characters with /vxv_main and /vxv_reroll. */
    linkChannelId: string;
    /** Channel where each event has its sign-up message. */
    raidChannelId: string;
    roles: DiscordRoleMapping;
  };
}

/** Reads and checks the environment, naming every missing or invalid variable. */
export function parseConfig(environment: Record<string, string | undefined>): WebConfig {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid website configuration:\n- ${problems.join("\n- ")}`);
  }
  const env = result.data;
  return {
    databaseUrl: env.DATABASE_URL,
    siteUrl: env.SITE_URL,
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      publicKey: env.DISCORD_PUBLIC_KEY,
      botToken: env.DISCORD_BOT_TOKEN,
      apiUrl: env.DISCORD_API_URL,
      guildId: env.DISCORD_GUILD_ID,
      linkChannelId: env.DISCORD_LINK_CHANNEL_ID,
      raidChannelId: env.DISCORD_RAID_CHANNEL_ID,
      roles: {
        treasurer: env.DISCORD_ROLE_TREASURER,
        officer: env.DISCORD_ROLE_OFFICER,
        gm: env.DISCORD_ROLE_GM,
      },
    },
  };
}

let config: WebConfig | undefined;

/** Read on first use, so that building the site never needs the secrets. */
export function getConfig(): WebConfig {
  config ??= parseConfig(process.env);
  return config;
}
