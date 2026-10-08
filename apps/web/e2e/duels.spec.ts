import { expect, test } from "@playwright/test";
import { WEB_ENVIRONMENT } from "./environment";
import { discordMessages } from "./fakeDiscord";
import { signInAs } from "./sessions";

const DUEL = "Duel : Dune Sable contre Ciel Gris";

test.describe.serial("duels", () => {
  test("a member challenges another, who is called on Discord in the duels channel", async ({
    page,
    context,
    request,
  }) => {
    await signInAs(context, "lockedMember");
    await page.goto("/pvp/duels");
    await page.getByLabel("Joueur défié").selectOption({ label: "Ciel Gris" });
    await page.getByLabel("Date et heure (heure de Paris)").fill("2031-06-01T21:00");
    await page.getByLabel("Lieu").fill("Porte d'Orgrimmar");
    await page.getByRole("button", { name: "Lancer le défi" }).click();
    await expect(page.getByRole("status")).toContainText("Défi lancé");
    await expect(page.getByRole("listitem", { name: DUEL })).toContainText("Porte d'Orgrimmar");

    const message = (await discordMessages(request)).find((candidate) =>
      String(candidate.body.content).includes("te défie en duel"),
    );
    expect(message?.channelId).toBe(WEB_ENVIRONMENT.DISCORD_DUELS_CHANNEL_ID);
    expect(message?.body.content).toBe("<@100>, Dune Sable te défie en duel !");
  });

  test("the challenged member takes it up: the guild bets on it, the duelists do not", async ({ page, context }) => {
    await signInAs(context, "officer");
    await page.goto("/pvp/duels");
    const duel = page.getByRole("listitem", { name: DUEL });
    await duel.getByRole("button", { name: "Relever le défi" }).click();
    await expect(duel).toContainText("Défi relevé");
    await duel.getByRole("link", { name: "Voir le pari" }).click();
    await expect(page.getByRole("heading", { name: DUEL })).toBeVisible();
    await page.getByRole("radio", { name: "Ciel Gris" }).check();
    await page.getByLabel("Mise (po)").fill("10");
    await page.getByRole("button", { name: "Miser" }).click();
    await expect(page.getByRole("status")).toContainText("Les joueurs d'un duel ne parient pas dessus.");

    await signInAs(context, "newcomer");
    await page.reload();
    await page.getByRole("radio", { name: "Dune Sable" }).check();
    await page.getByLabel("Mise (po)").fill("30");
    await page.getByRole("button", { name: "Miser" }).click();
    await expect(page.getByRole("status")).toContainText("Mise de 30 po enregistrée");
  });

  test("the loser concedes: the bet is settled and the Elo board moves", async ({ page, context }) => {
    await signInAs(context, "officer");
    await page.goto("/pvp/duels");
    await page.getByRole("listitem", { name: DUEL }).getByRole("button", { name: "J'ai perdu" }).click();
    await expect(page.getByRole("listitem", { name: DUEL })).toContainText("Dune Sable gagne");

    // The Elo board, as the Ranking's: the winner on the podium's banners, the officer's own place below.
    const podium = page.getByRole("list", { name: "Podium" });
    await expect(podium).toContainText("Dune");
    await expect(podium).toContainText("+10");
    await expect(page.getByRole("list", { name: "Ta position" })).toContainText("−10");
    await expect(page.getByText("Records des duels")).toBeVisible();
  });
});
