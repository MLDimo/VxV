import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

test("an anonymous visitor is asked to sign in with Discord", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/connexion$/);
  await expect(page.getByRole("link", { name: "Se connecter avec Discord" })).toBeVisible();
});

test("a member reaches the site but not the officer pages", async ({ page, context }) => {
  await signInAs(context, "member");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Raids à venir" })).toBeVisible();
  await expect(page.getByRole("navigation")).toContainText("Membre Test · Membre");
  await expect(page.getByRole("link", { name: "Liste de guilde" })).toHaveCount(0);
  await page.goto("/officiers/liste-de-guilde");
  await expect(page).toHaveURL(/\/$/);
});

test("signing out ends the session", async ({ page, context }) => {
  await signInAs(context, "leavingMember");
  await page.goto("/");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/connexion$/);
});
