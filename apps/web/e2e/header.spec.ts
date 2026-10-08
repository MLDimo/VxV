import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

test("the header shows every section on one line, with the member's name, from 1,400 px", async ({ page, context }) => {
  await signInAs(context, "officer");
  await page.goto("/personnages");
  const header = page.locator("header");
  await expect(header.getByRole("link", { name: "Personnages", exact: true })).toBeVisible();
  await expect(header.getByText("Officier Test", { exact: true })).toHaveAttribute("title", /Officier/);
  // One line: the header keeps its height.
  expect((await header.boundingBox())?.height).toBeLessThanOrEqual(72);
});

test("the header folds its sections into the burger menu under 1,400 px", async ({ page, context }) => {
  await signInAs(context, "officer");
  await page.setViewportSize({ width: 1366, height: 800 });
  await page.goto("/personnages");
  const header = page.locator("header");
  await expect(header.getByRole("link", { name: "PvP", exact: true })).toBeHidden();
  await header.getByLabel("Menu").click();
  await expect(header.getByRole("link", { name: "PvP", exact: true })).toBeVisible();
  await expect(header.getByText("Officier Test · Officier, Trésorier")).toBeVisible();
});
