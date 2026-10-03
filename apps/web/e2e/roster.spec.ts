import { expect, test } from "@playwright/test";
import { SEED_ROSTER } from "./environment";
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
    const roster = ["VXV-ROSTER-1", ...SEED_ROSTER, "Ðéjà;Vu;ROGUE", "Eole;Hermes;WARRIOR"].join("\n");
    await page.getByLabel("Liste copiée depuis l'addon").fill(roster);
    await page.getByLabel("Motif (visible dans le journal)").fill("Première liste de la guilde");
    await page.getByRole("button", { name: "Importer" }).click();
    await expect(page.getByRole("status")).toContainText("Liste importée : 2 ajoutés");

    await page.getByRole("link", { name: "Journal" }).click();
    const entry = page.getByRole("listitem").filter({ hasText: "Motif : Première liste de la guilde" });
    await expect(entry).toContainText("Import de la liste de guilde");
    await expect(entry).toContainText("2 ajoutés");
  });
});
