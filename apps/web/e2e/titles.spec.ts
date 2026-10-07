import { expect, test } from "@playwright/test";
import { WEB_ENVIRONMENT } from "./environment";
import { discordMemberState, discordMessages } from "./fakeDiscord";
import { signInAs } from "./sessions";

/** The Discord users of the prepared members who may have received items in raid. */
const MEMBERS_DISCORD_IDS = ["100", "200", "500", "600"];
const TITLE_NAMES = [
  "Roi du gambling",
  "Roi de la dette",
  "Numéro UNO",
  "Bien gras",
  "Goûteur de sol",
  "Chibrax au max",
  "Remboursé par la Sécu",
  "Lève toi copaing",
  "Sugar Daddy",
  "Il cheat c'est sûr",
  "Loser",
  "Princesse",
];

test("each Wednesday the titles are given once: the Ranking shows them, Discord announces them and gives the roles", async ({
  page,
  context,
  request,
}) => {
  expect((await request.get("/api/cron/titres")).status()).toBe(401);
  const authorization = { authorization: `Bearer ${WEB_ENVIRONMENT.CRON_SECRET}` };
  expect(await (await request.get("/api/cron/titres", { headers: authorization })).json()).toEqual({
    reassigned: true,
  });
  expect(await (await request.get("/api/cron/titres", { headers: authorization })).json()).toEqual({
    reassigned: false,
  });

  await signInAs(context, "member");
  await page.goto("/ranking");
  await page.getByRole("link", { name: "Titres" }).click();
  await expect(page).toHaveURL(/\/ranking\/titres$/);
  const titles = page.getByRole("region", { name: "Titres de la semaine" });
  await expect(titles.getByRole("heading")).toHaveText(TITLE_NAMES.map((name) => `◆ ${name}`));
  // The seeded raids gave items: Bien gras has a holder.
  await expect(titles.getByRole("article").filter({ hasText: "◆ Bien gras" })).not.toContainText(
    "Personne cette semaine",
  );
  await expect(page.getByRole("region", { name: "Officiers · titres à donner" })).toHaveCount(0);

  const message = (await discordMessages(request)).find(
    (candidate) => candidate.channelId === WEB_ENVIRONMENT.DISCORD_TITLES_CHANNEL_ID,
  );
  const embeds = message?.body.embeds as { title: string; fields: { name: string }[] }[] | undefined;
  expect(embeds?.[0]?.title).toBe("👑 Les titres de la semaine");
  expect(embeds?.[0]?.fields.map((field) => field.name)).toEqual(TITLE_NAMES.map((name) => `◆ ${name}`));
  const holders = await Promise.all(MEMBERS_DISCORD_IDS.map((userId) => discordMemberState(request, userId)));
  expect(holders.filter((state) => state.roles.includes("◆ Bien gras"))).toHaveLength(1);
});

test("an officer gives Princesse for the week: the Ranking shows her holder, Discord the role, the journal the reason", async ({
  page,
  context,
  request,
}) => {
  await signInAs(context, "officer");
  await page.goto("/ranking/titres");
  const form = page.getByRole("region", { name: "Officiers · titres à donner" });
  await form.getByRole("combobox", { name: "Titre" }).selectOption({ label: "Princesse" });
  await form.getByRole("combobox", { name: "Membre" }).selectOption({ label: "Dune Sable" });
  await form.getByLabel("Motif (visible dans le journal)").fill("Tous les soins du raid");
  await form.getByRole("button", { name: "Donner le titre" }).click();
  await expect(form.getByText("Titre donné pour la semaine.")).toBeVisible();
  const titles = page.getByRole("region", { name: "Titres de la semaine" });
  await expect(titles.getByRole("article").filter({ hasText: "◆ Princesse" })).toContainText("Dune Sable");
  expect((await discordMemberState(request, "500")).roles).toContain("◆ Princesse");
  await page.goto("/journal");
  await expect(page.getByText("Princesse : Dune Sable")).toBeVisible();
});
