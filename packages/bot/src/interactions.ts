import { ApplicationError } from "@vxv/server";
import {
  InteractionResponseType,
  InteractionType,
  type APIInteraction,
  type APIInteractionResponse,
} from "discord-api-types/v10";
import { isChatInputApplicationCommandInteraction, isGuildInteraction } from "discord-api-types/utils/v10";
import type { KeyObject } from "node:crypto";
import { SLASH_COMMANDS } from "./commandList.ts";
import type { BotContext } from "./commands.ts";
import { ephemeral } from "./responses.ts";
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

const UNAVAILABLE = "Cette action n'est pas encore disponible.";
const OUTSIDE_GUILD = "Utilise les commandes VXV sur le serveur Discord de la guilde.";
const FAILURE = "Une erreur est survenue. Réessaie dans un instant ; si elle persiste, préviens un officier.";

const commandsByName = new Map(SLASH_COMMANDS.map((command) => [command.definition.name, command]));

async function respond(interaction: APIInteraction, context: BotContext): Promise<APIInteractionResponse> {
  if (interaction.type === InteractionType.Ping) {
    return { type: InteractionResponseType.Pong };
  }
  if (!isGuildInteraction(interaction)) {
    return ephemeral(OUTSIDE_GUILD);
  }
  if (
    interaction.type === InteractionType.ApplicationCommand &&
    isChatInputApplicationCommandInteraction(interaction)
  ) {
    const command = commandsByName.get(interaction.data.name);
    return command === undefined ? ephemeral(UNAVAILABLE) : command.run(interaction, context);
  }
  if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
    const command = commandsByName.get(interaction.data.name);
    if (command?.autocomplete !== undefined) {
      return command.autocomplete(interaction, context);
    }
  }
  return ephemeral(UNAVAILABLE);
}

export function createInteractionHandler({ publicKey, ...context }: { publicKey: KeyObject } & BotContext) {
  /** Entry point of the interactions endpoint: refuses what Discord did not sign, then answers. */
  return async function handleInteraction(request: SignedRequest): Promise<InteractionReply> {
    if (!isSignedByDiscord(publicKey, request)) {
      return { status: HTTP_UNAUTHORIZED, body: { error: "invalid request signature" } };
    }
    try {
      return { status: HTTP_OK, body: await respond(JSON.parse(request.body) as APIInteraction, context) };
    } catch (error) {
      if (error instanceof ApplicationError) {
        return { status: HTTP_OK, body: ephemeral(error.message) };
      }
      console.error("Discord interaction failed", error);
      return { status: HTTP_OK, body: ephemeral(FAILURE) };
    }
  };
}

export type InteractionHandler = ReturnType<typeof createInteractionHandler>;
