import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./sessions";

async function addCharacter(page: Page, query: string, name: string, as: "main" | "reroll") {
  await page.getByRole("combobox", { name: "Nom du personnage" }).fill(query);
  await page.getByRole("option", { name }).click();
  await page.getByRole("button", { name: as === "main" ? "Ajouter comme main" : "Ajouter comme reroll" }).click();
}

test.describe.serial("character linking", () => {
  test.beforeEach(async ({ context, page }) => {
    await signInAs(context, "member");
    await page.goto("/personnages");
  });

  test("links a main found without typing the accent, then a reroll", async ({ page }) => {
    await addCharacter(page, "aube", "Aubé Clairval", "main");
    await expect(page.getByRole("status")).toContainText("Personnage ajouté comme main.");
    await addCharacter(page, "brume", "Brume Noire", "reroll");
    const list = page.getByRole("listitem");
    await expect(list.filter({ hasText: "Aubé Clairval" })).toContainText("Main");
    await expect(list.filter({ hasText: "Brume Noire" })).toContainText("Reroll");
  });

  test("no longer offers a character that is already linked", async ({ page }) => {
    await page.getByRole("combobox", { name: "Nom du personnage" }).fill("aube");
    await expect(page.getByRole("option")).toHaveCount(0);
  });

  test("makes the reroll the main, then removes a character", async ({ page }) => {
    await page.getByRole("button", { name: "Définir Brume Noire comme main" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Brume Noire" })).toContainText("Main");
    await expect(page.getByRole("listitem").filter({ hasText: "Aubé Clairval" })).toContainText("Reroll");
    await page.getByRole("button", { name: "Retirer Aubé Clairval" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Aubé Clairval" })).toHaveCount(0);
  });
});
