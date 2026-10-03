import {
  InteractionResponseType,
  InteractionType,
  MessageFlags,
  type APIInteraction,
  type APIInteractionResponse,
} from "discord-api-types/v10";
import type { KeyObject } from "node:crypto";
import { isSignedByDiscord } from "./signature.ts";

export interface SignedRequest {
  body: string;
  signature: string | null;
  timestamp: string | null;
}

export interface InteractionReply {
  status: number;
  body: APIInteractionResponse | { error: string };
}

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;

/** Private answer, shown only to the member who used the command. */
export function ephemeral(content: string): APIInteractionResponse {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { content, flags: MessageFlags.Ephemeral },
  };
}

export function createInteractionHandler({ publicKey }: { publicKey: KeyObject }) {
  /** Entry point of the interactions endpoint: refuses what Discord did not sign, then answers. */
  return async function handleInteraction(request: SignedRequest): Promise<InteractionReply> {
    if (!isSignedByDiscord(publicKey, request)) {
      return { status: HTTP_UNAUTHORIZED, body: { error: "invalid request signature" } };
    }
    const interaction = JSON.parse(request.body) as APIInteraction;
    if (interaction.type === InteractionType.Ping) {
      return { status: HTTP_OK, body: { type: InteractionResponseType.Pong } };
    }
    return { status: HTTP_OK, body: ephemeral("Cette action n'est pas encore disponible.") };
  };
}

export type InteractionHandler = ReturnType<typeof createInteractionHandler>;
