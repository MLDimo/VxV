import { autocomplete, slashCommand, type TestActor } from "@vxv/bot/testing";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { DISCORD, WEB_ENVIRONMENT } from "./environment";
import { signInAs } from "./sessions";

const ENDPOINT = "/api/discord/interactions";
const DISCORD_MEMBER: TestActor = {
  userId: "600",
  name: "Membre Discord",
  channelId: WEB_ENVIRONMENT.DISCORD_LINK_CHANNEL_ID,
};

/** Posts an interaction signed as Discord would sign it. */
function postSigned(request: APIRequestContext, interaction: unknown) {
  const signed = DISCORD.sign(interaction);
  return request.post(ENDPOINT, {
    data: signed.body,
    headers: {
      "content-type": "application/json",
      "x-signature-ed25519": signed.signature,
      "x-signature-timestamp": signed.timestamp,
    },
  });
}

test("Discord's ping is answered, and a request Discord did not sign is refused", async ({ request }) => {
  const pong = await postSigned(request, { type: 1 });
  expect(pong.status()).toBe(200);
  expect(await pong.json()).toEqual({ type: 1 });

  const unsigned = await request.post(ENDPOINT, { data: { type: 1 }, headers: { "content-type": "application/json" } });
  expect(unsigned.status()).toBe(401);
});

test("a member links their main with /vxv_main on Discord, and finds it on the website", async ({
  request,
  page,
  context,
}) => {
  const suggestions = await postSigned(request, autocomplete("vxv_main", "personnage", "eole", DISCORD_MEMBER));
  const { data } = (await suggestions.json()) as { data: { choices: { name: string; value: string }[] } };
  expect(data.choices).toEqual([{ name: "Éole Vent · Druide", value: expect.any(String) }]);

  const linked = await postSigned(
    request,
    slashCommand("vxv_main", { personnage: data.choices[0]?.value ?? "" }, DISCORD_MEMBER),
  );
  expect(await linked.json()).toMatchObject({
    data: { content: "Éole Vent est maintenant ton personnage principal." },
  });

  await signInAs(context, "discordMember");
  await page.goto("/personnages");
  await expect(page.getByRole("listitem").filter({ hasText: "Éole Vent" })).toContainText("Main");
});
