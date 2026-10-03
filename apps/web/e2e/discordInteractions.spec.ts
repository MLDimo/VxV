import { expect, test } from "@playwright/test";
import { DISCORD } from "./environment";

const ENDPOINT = "/api/discord/interactions";
const PING = { type: 1 };

test("Discord's ping is answered, and a request Discord did not sign is refused", async ({ request }) => {
  const signed = DISCORD.sign(PING);
  const pong = await request.post(ENDPOINT, {
    data: signed.body,
    headers: {
      "content-type": "application/json",
      "x-signature-ed25519": signed.signature,
      "x-signature-timestamp": signed.timestamp,
    },
  });
  expect(pong.status()).toBe(200);
  expect(await pong.json()).toEqual({ type: 1 });

  const unsigned = await request.post(ENDPOINT, { data: signed.body, headers: { "content-type": "application/json" } });
  expect(unsigned.status()).toBe(401);
});
