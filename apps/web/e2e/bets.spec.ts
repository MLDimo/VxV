import { buttonClick, formSubmission, type TestActor } from "@vxv/bot/testing";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { DISCORD_ROLES, WEB_ENVIRONMENT } from "./environment";
import { discordMessages, postSigned } from "./fakeDiscord";
import { signInAs } from "./sessions";

const TITLE = "Qui meurt en premier sur le boss 10 ?";
const NEXT_YEAR = new Date().getUTCFullYear() + 1;
/** A member of the guild's Discord server who never came to the website: they bet from Discord alone. */
const DISCORD_BETTOR: TestActor = {
  userId: "700",
  name: "Parieur Discord",
  channelId: WEB_ENVIRONMENT.DISCORD_BETS_CHANNEL_ID,
  roleIds: [DISCORD_ROLES.confirmed],
};

/** The bet's message the bot published, found by the link to the bet it carries. */
async function betMessage(request: APIRequestContext, betId: string) {
  const message = (await discordMessages(request)).find((candidate) =>
    JSON.stringify(candidate.body).includes(`/paris/${betId}"`),
  );
  const embeds = message?.body.embeds as { fields: { name: string; value: string }[] }[] | undefined;
  return message && { channelId: message.channelId, fields: embeds?.[0]?.fields ?? [] };
}

/** The choice's id, read from the stake form of the bet's page. */
async function choiceId(page: Page, label: string): Promise<string> {
  return (await page.getByRole("radio", { name: label }).getAttribute("value")) ?? "";
}

// The tests build on each other: the bet opened by the officer, then the stakes.
let betId = "";

test.describe.serial("bets", () => {
  test("an officer opens a bet on the website: its page, its Discord message and the journal", async ({
    page,
    context,
    request,
  }) => {
    await signInAs(context, "officer");
    await page.goto("/paris");
    await page.getByRole("link", { name: "Ouvrir un pari" }).click();
    await page.getByLabel("Question").fill(TITLE);
    await page.getByLabel(/^Choix, un par ligne/).fill("Un tank\nUn heal\nUn DPS");
    await page.getByLabel("Fermeture des mises (heure de Paris)").fill(`${String(NEXT_YEAR)}-12-10T21:00`);
    await page.getByLabel("Motif (visible dans le journal)").fill("Pour le raid de jeudi");
    await page.getByRole("button", { name: "Ouvrir le pari" }).click();
    await expect(page).toHaveURL(/\/paris\/[0-9a-f-]{36}$/);
    betId = page.url().split("/").pop() ?? "";
    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();

    const message = await betMessage(request, betId);
    expect(message?.channelId).toBe(WEB_ENVIRONMENT.DISCORD_BETS_CHANNEL_ID);
    expect(message?.fields.map((field) => field.name)).toEqual(["Un tank · —", "Un heal · —", "Un DPS · —"]);

    await page.getByRole("link", { name: "Journal" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Motif : Pour le raid de jeudi" })).toContainText(
      "Ouverture d'un pari",
    );
  });

  test("a member stakes on the website and sees the odds move, then the Discord message follows", async ({
    page,
    context,
    request,
  }) => {
    await signInAs(context, "member");
    await page.goto(`/paris/${betId}`);
    await expect(page.getByRole("link", { name: "Ouvrir un pari" })).toHaveCount(0);
    await page.getByRole("radio", { name: "Un tank" }).check();
    await page.getByLabel("Mise (po)").fill("50");
    await page.getByRole("button", { name: "Miser" }).click();
    await expect(page.getByRole("status")).toContainText("Mise de 50 po enregistrée : à payer au trésorier.");
    await expect(page.getByRole("row", { name: /^Un tank/ })).toContainText("× 1,00");
    await expect(page.getByText("Déposée · à payer")).toBeVisible();

    // Another member stakes from Discord: the button opens the form, the form saves the stake.
    const opened = await postSigned(request, buttonClick(`bet:${betId}`, DISCORD_BETTOR));
    expect(await opened.json()).toMatchObject({ type: 9 });
    const staked = await postSigned(
      request,
      formSubmission(
        `bet-form:${betId}`,
        { selects: { choice: await choiceId(page, "Un heal") }, texts: { amount: "150" } },
        DISCORD_BETTOR,
      ),
    );
    expect(JSON.stringify(await staked.json())).toContain("Ta mise : 150");

    await page.reload();
    await expect(page.getByRole("row", { name: /^Un tank/ })).toContainText("× 3,60");
    await expect(page.getByRole("row", { name: /^Parieur Discord/ })).toContainText("Un heal");
    const message = await betMessage(request, betId);
    expect(message?.fields.map((field) => field.name.replace(/\s/gu, " "))).toEqual([
      "Un tank · × 3,60",
      "Un heal · × 1,20",
      "Un DPS · —",
    ]);
  });

  test("a member moves their stake, then takes it back", async ({ page, context }) => {
    await signInAs(context, "member");
    await page.goto(`/paris/${betId}`);
    await page.getByRole("radio", { name: "Un DPS" }).check();
    await page.getByLabel("Mise (po)").fill("20");
    await page.getByRole("button", { name: "Modifier ma mise" }).click();
    await expect(page.getByRole("status")).toContainText("Mise de 20 po enregistrée");
    await page.getByRole("button", { name: "Retirer ma mise" }).click();
    await expect(page.getByRole("status")).toContainText("Mise retirée.");
    await expect(page.getByText("Déposée · à payer")).toHaveCount(0);
  });

  test("the tavern shows the bet on Le Dé Pipé's card", async ({ page, context }) => {
    await signInAs(context, "member");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
    await expect(page.getByText("Cagnotte 150 po")).toBeVisible();
  });

  test("an officer declares the result: the gains, the Discord message, the cash and the journal", async ({
    page,
    context,
    request,
  }) => {
    // The member stakes again, on the losing choice: 150 po on the heal (from Discord) against 50 on the tank.
    await signInAs(context, "member");
    await page.goto(`/paris/${betId}`);
    await page.getByRole("radio", { name: "Un tank" }).check();
    await page.getByLabel("Mise (po)").fill("50");
    await page.getByRole("button", { name: "Miser" }).click();
    await expect(page.getByRole("status")).toContainText("Mise de 50 po enregistrée");

    await signInAs(context, "officer");
    await page.goto(`/paris/${betId}`);
    await page.getByLabel("Choix gagnant").selectOption({ label: "Un heal" });
    await page.getByLabel("Motif (visible dans le journal)").fill("Le heal est tombé en premier");
    await page.getByRole("button", { name: "Déclarer le résultat" }).click();
    // The ended bet has no officers' form any more: its result shows instead.
    await expect(page.getByText("Résultat : « Un heal »")).toBeVisible();
    // 200 po in the pool, 20 for the organisation: the 150 po on the heal bring back 180.
    await expect(page.getByRole("row", { name: /^Parieur Discord/ })).toContainText("Gagné (180 po)");
    await expect(page.getByRole("row", { name: /^Parieur Discord/ })).toContainText("À verser");
    await expect(page.getByRole("button", { name: "Déclarer le résultat" })).toHaveCount(0);

    const message = (await discordMessages(request)).find((candidate) =>
      JSON.stringify(candidate.body).includes(`/paris/${betId}"`),
    );
    expect(JSON.stringify(message?.body)).toContain("Résultat : « Un heal »");

    await page.getByRole("link", { name: "Journal" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Résultat d'un pari" })).toContainText(
      "Motif : Le heal est tombé en premier",
    );
    await expect(page.getByText(`Pari « ${TITLE} » : part de l'organisation`)).toBeVisible();
  });

  test("the member owes their lost stake; the treasurer notes it received and hands the gain over", async ({
    page,
    context,
  }) => {
    await signInAs(context, "member");
    await page.goto("/paris/tresorerie");
    await expect(page.getByText("Dette : 50 po")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reçue" })).toHaveCount(0);

    // The test officer is also the treasurer.
    await signInAs(context, "officer");
    await page.goto("/paris/tresorerie");
    const debts = page.getByRole("region", { name: "Dettes" });
    await debts.getByRole("button", { name: "Reçue" }).click();
    await expect(page.getByRole("region", { name: "Dettes" })).toContainText("Aucune dette.");
    const gains = page.getByRole("region", { name: "Gains et remboursements à verser" });
    await expect(gains).toContainText("30 po");
    await gains.getByRole("button", { name: "Versé" }).click();
    await expect(page.getByRole("region", { name: "Gains et remboursements à verser" })).toContainText(
      "Rien à verser.",
    );
    await expect(page.getByRole("region", { name: "Historique" })).toContainText("a versé 30 po à Parieur Discord");

    await signInAs(context, "member");
    await page.goto("/paris/tresorerie");
    await expect(page.getByText("Dette : aucune")).toBeVisible();
  });

  test("the treasurer records a donation in the guild's cash, for all to see", async ({ page, context }) => {
    await signInAs(context, "officer");
    await page.goto("/journal");
    await page.getByLabel("Mouvement").selectOption({ label: "Don" });
    await page.getByLabel("Montant (po)").fill("500");
    await page.getByLabel("Libellé").fill("Don pour les flacons");
    await page.getByLabel("Donateur (pour un don)").selectOption({ index: 1 });
    await page.getByLabel("Motif").fill("Remis en jeu au trésorier");
    await page.getByRole("button", { name: "Inscrire dans la caisse" }).click();
    await expect(page.getByRole("status")).toContainText("Mouvement inscrit dans la caisse.");

    await signInAs(context, "member");
    await page.goto("/journal");
    await expect(page.getByText("Don pour les flacons")).toBeVisible();
    await expect(page.getByText("520 po", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Inscrire dans la caisse" })).toHaveCount(0);
  });

  test("the Ranking shows the bettors by net gain, and an officer starts a season", async ({ page, context }) => {
    await signInAs(context, "member");
    await page.goto("/");
    await page.getByRole("link", { name: "Ranking", exact: true }).last().click();
    await expect(page).toHaveURL(/\/ranking$/);
    // Parieur Discord won 180 po for 150 staked; the member lost 50 and finds their own place at the bottom.
    const podium = page.getByRole("list", { name: "Podium" });
    await expect(podium.getByRole("listitem").filter({ hasText: "Parieur" })).toContainText("+30 po");
    await expect(page.getByRole("list", { name: "Ta position" })).toContainText(/ta position.*−50/);
    await expect(page.getByRole("region", { name: "Records depuis toujours" })).toContainText("Plus gros gain");
    await expect(page.getByRole("button", { name: "Lancer une nouvelle saison" })).toHaveCount(0);

    await signInAs(context, "officer");
    await page.goto("/ranking?periode=saison");
    await expect(page.getByText("Aucune saison lancée : un officier la lance dans la catégorie Paris.")).toBeVisible();
    await page.getByLabel("Motif (visible dans le journal)").fill("Lancement des classements");
    await page.getByRole("button", { name: "Lancer une nouvelle saison" }).click();
    await expect(page.getByRole("status")).toContainText("Saison 1 lancée.");
    await expect(page.getByRole("link", { name: "Saison 1" })).toBeVisible();
    await expect(page.getByText("Personne au classement sur cette période.")).toBeVisible();
  });
});
