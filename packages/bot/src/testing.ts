import { createPrivateKey, createPublicKey, randomBytes, sign } from "node:crypto";
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ComponentType,
  InteractionType,
  type APIApplicationCommandAutocompleteGuildInteraction,
  type APIChatInputApplicationCommandGuildInteraction,
  type APIMessageComponentGuildInteraction,
  type APIModalSubmitGuildInteraction,
} from "discord-api-types/v10";
import type { SignedRequest } from "./interactions.ts";

// PKCS#8 header of an Ed25519 private key, followed by its 32-byte seed.
const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const SEED_BYTES = 32;

/**
 * A key pair standing for the Discord application, and requests signed as Discord would sign them.
 * A fixed seed gives the same keys in every process (end-to-end tests: website and test runner).
 */
export function createTestSigner(seed: Buffer = randomBytes(SEED_BYTES)) {
  const privateKey = createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]),
    format: "der",
    type: "pkcs8",
  });
  const { x } = createPublicKey(privateKey).export({ format: "jwk" });
  return {
    publicKeyHex: Buffer.from(x ?? "", "base64url").toString("hex"),
    sign(body: unknown, timestamp = "1791000000"): SignedRequest & { signature: string; timestamp: string } {
      const text = JSON.stringify(body);
      return {
        body: text,
        signature: sign(null, Buffer.from(timestamp + text), privateKey).toString("hex"),
        timestamp,
      };
    },
  };
}

/** Who acts on Discord, and where. */
export interface TestActor {
  userId: string;
  name: string;
  roleIds?: string[];
  channelId: string;
}

/** The fields of a guild interaction the bot reads; Discord sends many more. */
function guildInteraction(actor: TestActor) {
  return {
    id: "interaction",
    application_id: "application",
    token: "token",
    version: 1,
    guild_id: "guild",
    channel: { id: actor.channelId, type: 0 },
    member: {
      user: { id: actor.userId, username: actor.name.toLowerCase(), global_name: actor.name },
      roles: actor.roleIds ?? [],
    },
  };
}

/** A slash command as Discord sends it, with text options. */
export function slashCommand(
  name: string,
  options: Record<string, string>,
  actor: TestActor,
): APIChatInputApplicationCommandGuildInteraction {
  return {
    ...guildInteraction(actor),
    type: InteractionType.ApplicationCommand,
    data: {
      id: "command",
      name,
      type: ApplicationCommandType.ChatInput,
      options: Object.entries(options).map(([option, value]) => ({
        name: option,
        type: ApplicationCommandOptionType.String,
        value,
      })),
    },
  } as unknown as APIChatInputApplicationCommandGuildInteraction;
}

/** The autocomplete request Discord sends while the member types an option. */
export function autocomplete(
  name: string,
  option: string,
  typed: string,
  actor: TestActor,
): APIApplicationCommandAutocompleteGuildInteraction {
  return {
    ...guildInteraction(actor),
    type: InteractionType.ApplicationCommandAutocomplete,
    data: {
      id: "command",
      name,
      type: ApplicationCommandType.ChatInput,
      options: [{ name: option, type: ApplicationCommandOptionType.String, value: typed, focused: true }],
    },
  } as unknown as APIApplicationCommandAutocompleteGuildInteraction;
}

/** A click on a button of a message. */
export function buttonClick(customId: string, actor: TestActor): APIMessageComponentGuildInteraction {
  return {
    ...guildInteraction(actor),
    type: InteractionType.MessageComponent,
    message: { id: "message", channel_id: actor.channelId },
    data: { custom_id: customId, component_type: ComponentType.Button },
  } as unknown as APIMessageComponentGuildInteraction;
}

/** A form (modal) sent by the member: one value per select menu, and the typed texts. */
export function formSubmission(
  customId: string,
  fields: { selects: Record<string, string>; texts: Record<string, string> },
  actor: TestActor,
): APIModalSubmitGuildInteraction {
  const selects = Object.entries(fields.selects).map(([field, value]) => ({
    type: ComponentType.Label,
    component: { type: ComponentType.StringSelect, custom_id: field, values: [value] },
  }));
  const texts = Object.entries(fields.texts).map(([field, value]) => ({
    type: ComponentType.Label,
    component: { type: ComponentType.TextInput, custom_id: field, value },
  }));
  return {
    ...guildInteraction(actor),
    type: InteractionType.ModalSubmit,
    data: { custom_id: customId, components: [...selects, ...texts] },
  } as unknown as APIModalSubmitGuildInteraction;
}
