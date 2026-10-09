import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

test("an anonymous visitor is asked to sign in with Discord", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/connexion$/);
  await expect(page.getByRole("link", { name: "Connexion Discord" })).toBeVisible();
});

test("anyone reads the member guide, without signing in", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByRole("link", { name: "Lire le guide du membre" }).click();
  await expect(page).toHaveURL(/\/guide$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Le guide de la taverne");
  // Its pictures come from the website: the guild's logo, the bot's emojis, the charter's captures.
  for (const picture of [
    page.locator('img[src="/images/logo.jpg"]').first(),
    page.locator('img[src^="/guide/emojis/"]').first(),
    page.locator('img[src^="/guide/captures/"]').first(),
  ]) {
    await picture.scrollIntoViewIfNeeded();
    await expect.poll(() => picture.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  }
});

test("a member reaches the tavern but not the officer pages", async ({ page, context }) => {
  await signInAs(context, "member");
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Raid", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("navigation")).toContainText("Membre Test · Membre");
  await expect(page.getByRole("link", { name: "Liste de guilde" })).toHaveCount(0);
  await page.goto("/officiers/liste-de-guilde");
  await expect(page).toHaveURL(/\/$/);
});

test("an officer who is also treasurer sees both roles and the officer pages", async ({ page, context }) => {
  await signInAs(context, "officer");
  await page.goto("/");
  await expect(page.getByRole("navigation")).toContainText("Officier Test · Officier, Trésorier");
  await page.getByRole("link", { name: "Liste de guilde" }).click();
  await expect(page).toHaveURL(/\/officiers\/liste-de-guilde$/);
});

test("signing out ends the session", async ({ page, context }) => {
  await signInAs(context, "leavingMember");
  await page.goto("/");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/connexion$/);
});

test("an unknown event shows a French not-found page", async ({ page, context }) => {
  await signInAs(context, "member");
  await page.goto("/evenements/00000000-0000-0000-0000-000000000000");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await page.goto("/evenements/pas-un-identifiant");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
});
