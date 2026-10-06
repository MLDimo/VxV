import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

test("a member finds the companion's installers and how to install them", async ({ page, context }) => {
  await signInAs(context, "member");
  await page.goto("/");
  await page.getByRole("link", { name: "Compagnon" }).first().click();
  await expect(page).toHaveURL(/\/compagnon$/);
  await expect(page.getByRole("heading", { name: "Le compagnon" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Windows" })).toHaveAttribute(
    "href",
    "https://github.com/MLDimo/vxv-compagnon/releases/latest/download/VXV-Compagnon-Setup.exe",
  );
  await expect(page.getByRole("link", { name: "Mac" })).toHaveAttribute(
    "href",
    "https://github.com/MLDimo/vxv-compagnon/releases/latest/download/VXV-Compagnon.dmg",
  );
  await expect(page.getByText("Exécuter quand même")).toBeVisible();
});
