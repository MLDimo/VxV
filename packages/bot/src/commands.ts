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
  /** Channel where each raid night has its sign-up message. */
  raidChannelId: string;
  /** Channel where each PvP outing has its sign-up message. */
  pvpChannelId: string;
  /** Channel where each bet has its message. */
  betsChannelId: string;
  /** Channel where each mission has its message. */
  missionsChannelId: string;
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

type CommandInteraction =
  APIChatInputApplicationCommandGuildInteraction | APIApplicationCommandAutocompleteGuildInteraction;

const optionNamed = (interaction: CommandInteraction, name: string) =>
  interaction.data.options?.find((candidate) => candidate.name === name);

/** Value of a text option of the command, empty when absent. */
export function stringOption(interaction: CommandInteraction, name: string): string {
  const option = optionNamed(interaction, name);
  return option?.type === ApplicationCommandOptionType.String ? option.value : "";
}

/** Value of a whole number option of the command, undefined when absent. */
export function integerOption(interaction: CommandInteraction, name: string): number | undefined {
  const option = optionNamed(interaction, name);
  return option?.type === ApplicationCommandOptionType.Integer && typeof option.value === "number"
    ? option.value
    : undefined;
}

/** Id of the Discord role picked for a role option of the command, empty when absent. */
export function roleOption(interaction: CommandInteraction, name: string): string {
  const option = optionNamed(interaction, name);
  return option?.type === ApplicationCommandOptionType.Role ? option.value : "";
}

/** The option the member is typing, which an autocomplete request is about. */
export function focusedOption(interaction: APIApplicationCommandAutocompleteGuildInteraction): {
  name: string;
  value: string;
} {
  const option = interaction.data.options.find((candidate) => "focused" in candidate && candidate.focused === true);
  return { name: option?.name ?? "", value: option !== undefined && "value" in option ? String(option.value) : "" };
}
