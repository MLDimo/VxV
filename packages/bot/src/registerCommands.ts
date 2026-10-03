// Usage: DISCORD_BOT_TOKEN=… DISCORD_CLIENT_ID=… DISCORD_GUILD_ID=… npm run register-commands -w @vxv/bot
// Replaces the guild's commands with the bot's current list (run after each production deployment).
import { SLASH_COMMANDS } from "./commandList.ts";

const DISCORD_API = "https://discord.com/api/v10";

const { DISCORD_BOT_TOKEN: token, DISCORD_CLIENT_ID: applicationId, DISCORD_GUILD_ID: guildId } = process.env;
if (!token || !applicationId || !guildId) {
  throw new Error("DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID and DISCORD_GUILD_ID are required.");
}

const response = await fetch(`${DISCORD_API}/applications/${applicationId}/guilds/${guildId}/commands`, {
  method: "PUT",
  headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(SLASH_COMMANDS.map((command) => command.definition)),
});
if (!response.ok) {
  throw new Error(`Discord refused the commands (${response.status}): ${await response.text()}`);
}
console.log(`${SLASH_COMMANDS.length} commandes enregistrées sur le serveur.`);
