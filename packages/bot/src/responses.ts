import { InteractionResponseType, MessageFlags, type APIInteractionResponse } from "discord-api-types/v10";

/** Private answer, shown only to the member who acted. */
export function ephemeral(content: string): APIInteractionResponse {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { content, flags: MessageFlags.Ephemeral },
  };
}
