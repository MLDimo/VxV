import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

test.describe.serial("guild roster import", () => {
  test.beforeEach(async ({ context }) => {
    await signInAs(context, "officer");
  });

  test("lists every problem of a malformed roster", async ({ page }) => {
    await page.goto("/officiers/liste-de-guilde");
    await page.getByLabel("Liste copiée depuis l'addon").fill("VXV-ROSTER-1\nÐéjà;Vu\nEole;Hermes;Guerrier");
    await page.getByLabel("Motif (visible dans le journal)").fill("Essai");
    await page.getByRole("button", { name: "Importer" }).click();
    await expect(page.getByRole("status")).toContainText("Ligne 2 : format attendu Prénom;Nom;CLASSE.");
    await expect(page.getByRole("status")).toContainText("Ligne 3 : classe inconnue « Guerrier ».");
  });

  test("imports the roster and records it in the journal", async ({ page }) => {
    await page.goto("/officiers/liste-de-guilde");
    await page.getByLabel("Liste copiée depuis l'addon").fill("VXV-ROSTER-1\nÐéjà;Vu;ROGUE\nEole;Hermes;WARRIOR");
    await page.getByLabel("Motif (visible dans le journal)").fill("Première liste de la guilde");
    await page.getByRole("button", { name: "Importer" }).click();
    await expect(page.getByRole("status")).toContainText("Liste importée : 2 ajoutés");

    await page.getByRole("link", { name: "Journal" }).click();
    await expect(page.getByText("Import de la liste de guilde")).toBeVisible();
    await expect(page.getByText("Motif : Première liste de la guilde")).toBeVisible();
  });
});
