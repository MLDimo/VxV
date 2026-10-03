import { autocomplete, buttonClick, formSubmission, slashCommand, type TestActor } from "@vxv/bot/testing";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { DISCORD, DISCORD_ROLES, WEB_ENVIRONMENT } from "./environment";
import { discordEventMessage, discordMemberState } from "./fakeDiscord";
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

// The tests build on each other: the member's main, linked with /vxv_main, then the raid created with /vxv_raid.
let discordRaidId = "";

test.describe.serial("Discord bot", () => {
  test("Discord's ping is answered, and a request Discord did not sign is refused", async ({ request }) => {
    const pong = await postSigned(request, { type: 1 });
    expect(pong.status()).toBe(200);
    expect(await pong.json()).toEqual({ type: 1 });

    const unsigned = await request.post(ENDPOINT, {
      data: { type: 1 },
      headers: { "content-type": "application/json" },
    });
    expect(unsigned.status()).toBe(401);
  });

  test("a member links their main with /vxv_main: renamed on Discord with the class role, shown on the website", async ({
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
      data: {
        content: "Éole Vent est maintenant ton personnage principal. Pseudo Discord et rôle de classe mis à jour.",
      },
    });
    expect(await discordMemberState(request, DISCORD_MEMBER.userId)).toEqual({
      nickname: "Membre Discord - [Éole Vent]",
      roles: ["Druide"],
    });

    await signInAs(context, "discordMember");
    await page.goto("/personnages");
    await expect(page.getByRole("listitem").filter({ hasText: "Éole Vent" })).toContainText("Main");
  });

  test("an officer creates a raid with /vxv_raid, published in the raid channel", async ({
    request,
    page,
    context,
  }) => {
    const officer: TestActor = {
      userId: "100",
      name: "Officier Test",
      roleIds: [DISCORD_ROLES.officer],
      channelId: "1",
    };
    const plan = { raid: "salle-des-thanes", date: "20/03/2031", heure: "21h", motif: "Raid créé depuis Discord" };
    const reply = await postSigned(request, slashCommand("vxv_raid", plan, officer));
    expect(await reply.json()).toMatchObject({
      data: { content: `Événement créé et publié dans <#${WEB_ENVIRONMENT.DISCORD_RAID_CHANNEL_ID}>.` },
    });

    await signInAs(context, "officer");
    await page.goto("/");
    await page
      .getByRole("link", { name: /La salle des Thanes/ })
      .filter({ hasText: "20 mars 2031" })
      .click();
    await expect(page).toHaveURL(/\/evenements\/[0-9a-f-]{36}$/);
    discordRaidId = page.url().split("/").pop() ?? "";
    const message = await discordEventMessage(request, discordRaidId);
    expect(message?.embed?.title).toBe("La salle des Thanes");
  });

  test("a member signs up with the raid message's button: shown on the website and in the message", async ({
    request,
    page,
    context,
  }) => {
    const raider = { ...DISCORD_MEMBER, channelId: WEB_ENVIRONMENT.DISCORD_RAID_CHANNEL_ID };
    const opened = await postSigned(request, buttonClick(`signup:${discordRaidId}`, raider));
    const form = (await opened.json()) as {
      type: number;
      data: { custom_id: string; components: { component: { options?: { value: string }[] } }[] };
    };
    expect(form.type).toBe(9);
    const characterId = form.data.components[0]?.component.options?.[0]?.value ?? "";

    const sent = await postSigned(
      request,
      formSubmission(
        form.data.custom_id,
        { selects: { character: characterId, role: "healer", status: "present" }, texts: { spec: "Restauration" } },
        raider,
      ),
    );
    expect(await sent.json()).toMatchObject({
      data: { content: "Inscription enregistrée : Éole Vent, Soigneur (Restauration), Présent." },
    });
    expect(JSON.stringify(await discordEventMessage(request, discordRaidId))).toContain("Éole Vent (Restauration)");

    await signInAs(context, "officer");
    await page.goto(`/evenements/${discordRaidId}`);
    await expect(page.getByRole("listitem").filter({ hasText: "Éole Vent" })).toContainText("Restauration");
  });

  test("a sign-up made on the website updates the raid's message on Discord", async ({ request, page, context }) => {
    await signInAs(context, "officer");
    await page.goto(`/evenements/${discordRaidId}`);
    await page.getByLabel("Personnage").selectOption({ label: "Ciel Gris" });
    await page.getByLabel("Rôle").selectOption({ label: "Tank" });
    await page.getByLabel("Spécialisation").fill("Protection");
    await page.getByLabel("Statut").selectOption({ label: "Présent" });
    await page.getByRole("button", { name: "M'inscrire" }).click();
    await expect(page.getByRole("status")).toContainText("Inscription enregistrée.");

    const message = await discordEventMessage(request, discordRaidId);
    expect(message?.embed?.fields[0]).toEqual({ name: "🛡️ Tank · 1", value: "Ciel Gris (Protection)", inline: true });
  });
});
