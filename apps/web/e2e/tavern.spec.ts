import { expect, test } from "@playwright/test";
import { readSeed, signInAs } from "./sessions";

test("the tavern opens the places already built and announces the others", async ({ page, context }) => {
  await signInAs(context, "member");
  await page.goto("/");
  for (const place of ["Le Dé Pipé", "Quêtes", "Ranking", "Artisans"]) {
    await expect(page.getByTitle(`${place} : bientôt`)).toBeVisible();
  }
  // The Raid of the tavern, after the one of the header.
  await page.getByRole("link", { name: "Raid", exact: true }).last().click();
  await expect(page).toHaveURL(/\/raid$/);
  await expect(page.getByRole("heading", { name: "Raids à venir" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Journal", exact: true }).last().click();
  await expect(page).toHaveURL(/\/journal$/);
});

test("the next raid's card leads to its soft reserves", async ({ page, context }) => {
  await signInAs(context, "member");
  await page.goto("/");
  await page.getByRole("link", { name: "Choisir mes SR" }).click();
  // The seed's soonest event starts ten minutes after the seed.
  await expect(page).toHaveURL(new RegExp(`/evenements/${readSeed().lockedEventId}$`));
});
