import { emoji } from "@vxv/bot/testing";
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
  "Grand duelliste",
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
  expect(embeds?.[0]?.title).toBe(`${emoji("ranking")} Les titres de la semaine`);
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
  const form = page.getByRole("form", { name: "Donner un titre de la semaine" });
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

test("an officer makes a title by hand: the Ranking shows it, Discord gives the role, until an officer takes it back", async ({
  page,
  context,
  request,
}) => {
  await signInAs(context, "officer");
  await page.goto("/ranking/titres");
  const form = page.getByRole("form", { name: "Créer un titre" });
  await form.getByLabel("Nom du titre").fill("Sauveur du raid");
  await form.getByRole("combobox", { name: "Membre" }).selectOption({ label: "Dune Sable" });
  await form
    .getByRole("combobox", { name: "Durée" })
    .selectOption({ label: "Durée indéterminée (jusqu'à ce qu'un officier le retire)" });
  await form.getByLabel("Pourquoi, affiché avec le titre (visible dans le journal)").fill("A tenu Onyxia seul");
  await form.getByRole("button", { name: "Créer le titre" }).click();
  await expect(form.getByText("Titre donné.")).toBeVisible();
  const made = page
    .getByRole("region", { name: "Titres faits main" })
    .getByRole("article")
    .filter({ hasText: "◆ Sauveur du raid" });
  await expect(made).toContainText("Dune Sable");
  await expect(made).toContainText("A tenu Onyxia seul");
  await expect(made).toContainText("pour une durée indéterminée");
  expect((await discordMemberState(request, "500")).roles).toContain("◆ Sauveur du raid");

  const takeBack = made.getByRole("form", { name: "Retirer Sauveur du raid" });
  await takeBack.getByLabel("Motif du retrait (visible dans le journal)").fill("Fin de l'exploit");
  await takeBack.getByRole("button", { name: "Retirer le titre" }).click();
  await expect(page.getByRole("region", { name: "Titres faits main" })).toHaveCount(0);
  expect((await discordMemberState(request, "500")).roles).not.toContain("◆ Sauveur du raid");
  await page.goto("/journal");
  await expect(page.getByText("Sauveur du raid : repris à Dune Sable")).toBeVisible();
});
