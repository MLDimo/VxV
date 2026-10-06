import type { APIRequestContext } from "@playwright/test";
import type { FakeMessage } from "@vxv/server/testing";
import { DISCORD, FAKE_DISCORD_URL } from "./environment";

export const INTERACTIONS_ENDPOINT = "/api/discord/interactions";

/** Posts to the website an interaction signed as Discord would sign it. */
export function postSigned(request: APIRequestContext, interaction: unknown) {
  const signed = DISCORD.sign(interaction);
  return request.post(INTERACTIONS_ENDPOINT, {
    data: signed.body,
    headers: {
      "content-type": "application/json",
      "x-signature-ed25519": signed.signature,
      "x-signature-timestamp": signed.timestamp,
    },
  });
}

/** What the bot did on a member, as the fake Discord saw it. */
export async function discordMemberState(
  request: APIRequestContext,
  userId: string,
): Promise<{ nickname?: string; roles: string[] }> {
  return (await request.get(`${FAKE_DISCORD_URL}/state/${userId}`)).json() as Promise<{
    nickname?: string;
    roles: string[];
  }>;
}

/** Every message the bot published, in order. */
export async function discordMessages(request: APIRequestContext): Promise<FakeMessage[]> {
  return (await request.get(`${FAKE_DISCORD_URL}/messages`)).json() as Promise<FakeMessage[]>;
}

/** The sign-up message the bot published for an event, found by the exact event link it carries. */
export async function discordEventMessage(request: APIRequestContext, eventId: string) {
  const messages = await discordMessages(request);
  const link = `/evenements/${eventId}"`;
  const message = messages.find((candidate) => JSON.stringify(candidate.body).includes(link));
  const embeds = message?.body.embeds as { title: string; fields: { name: string; value: string }[] }[] | undefined;
  return message && { channelId: message.channelId, embed: embeds?.[0] };
}
