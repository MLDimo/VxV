import { buttonClick, formSubmission, type TestActor } from "@vxv/bot/testing";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { WEB_ENVIRONMENT } from "./environment";
import { discordMessages, postSigned } from "./fakeDiscord";
import { signInAs } from "./sessions";

const TITLE = "Qui meurt en premier sur le boss 10 ?";
const NEXT_YEAR = new Date().getUTCFullYear() + 1;
/** A member of the guild's Discord server who never came to the website: they bet from Discord alone. */
const DISCORD_BETTOR: TestActor = {
  userId: "700",
  name: "Parieur Discord",
  channelId: WEB_ENVIRONMENT.DISCORD_BETS_CHANNEL_ID,
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
});
