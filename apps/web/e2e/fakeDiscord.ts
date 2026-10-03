import type { APIRequestContext } from "@playwright/test";
import type { FakeMessage } from "@vxv/server/testing";
import { FAKE_DISCORD_URL } from "./environment";

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

/** The sign-up message the bot published for an event, found by the event link it carries. */
export async function discordEventMessage(request: APIRequestContext, eventId: string) {
  const messages = (await (await request.get(`${FAKE_DISCORD_URL}/messages`)).json()) as FakeMessage[];
  const message = messages.find((candidate) => JSON.stringify(candidate.body).includes(`/evenements/${eventId}`));
  const embeds = message?.body.embeds as { title: string; fields: { name: string; value: string }[] }[] | undefined;
  return message && { channelId: message.channelId, embed: embeds?.[0] };
}
