import type { Application } from "@vxv/server";
import {
  ApplicationCommandOptionType,
  type APIApplicationCommandAutocompleteGuildInteraction,
  type APIApplicationCommandAutocompleteResponse,
  type APIChatInputApplicationCommandGuildInteraction,
  type APIInteractionResponse,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";

/** What every command may use: the use cases and the guild's channels. */
export interface BotContext {
  app: Application;
  /** Channel where members link their characters. */
  linkChannelId: string;
}

export interface SlashCommand {
  /** Sent to Discord when the commands are registered. */
  definition: RESTPostAPIChatInputApplicationCommandsJSONBody;
  run(
    interaction: APIChatInputApplicationCommandGuildInteraction,
    context: BotContext,
  ): Promise<APIInteractionResponse>;
  autocomplete?(
    interaction: APIApplicationCommandAutocompleteGuildInteraction,
    context: BotContext,
  ): Promise<APIApplicationCommandAutocompleteResponse>;
}

/** Value of a text option of the command, empty when absent. */
export function stringOption(
  interaction: APIChatInputApplicationCommandGuildInteraction | APIApplicationCommandAutocompleteGuildInteraction,
  name: string,
): string {
  const option = interaction.data.options?.find((candidate) => candidate.name === name);
  return option?.type === ApplicationCommandOptionType.String ? option.value : "";
}
