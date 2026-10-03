import type { SlashCommand } from "./commands.ts";
import { LINK_COMMANDS } from "./linkCommands.ts";

/** Every slash command of the bot: registered on the guild and dispatched by name. */
export const SLASH_COMMANDS: readonly SlashCommand[] = [...LINK_COMMANDS];
