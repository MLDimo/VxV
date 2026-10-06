import { expect, test } from "@playwright/test";
import { readSeed, signInAs } from "./sessions";

test("the tavern opens every place", async ({ page, context }) => {
  await signInAs(context, "member");
  await page.goto("/");
  await expect(page.getByTitle(/ : bientôt$/)).toHaveCount(0);
  // The Raid of the tavern, after the one of the header.
  await page.getByRole("link", { name: "Raid", exact: true }).last().click();
  await expect(page).toHaveURL(/\/raid$/);
  await expect(page.getByRole("heading", { name: "Raids à venir" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Le Dé Pipé", exact: true }).last().click();
  await expect(page).toHaveURL(/\/paris$/);
  // Its screen stands over the tavern framed on its door, as in the addon.
  await expect(page.locator('[data-place="dice"]')).toHaveCount(1);

  await page.goto("/");
  await page.getByRole("link", { name: "Artisans", exact: true }).last().click();
  await expect(page).toHaveURL(/\/artisans$/);

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
