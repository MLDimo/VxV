import { expect, test, type Page } from "@playwright/test";
import { readSeed, signInAs } from "./sessions";

const eventPage = () => `/evenements/${readSeed().softReserveEventId}`;
const itemRow = (page: Page, name: string) => page.getByRole("listitem").filter({ hasText: name });

test.describe.serial("soft reserves", () => {
  test("a signed-up officer reserves an item within the allowance", async ({ page, context }) => {
    await signInAs(context, "officer");
    await page.goto(eventPage());
    await expect(page.getByText("Vous avez droit à 1 SR : 0 choisie(s).")).toBeVisible();
    await page.getByLabel("Croc de Magmatus", { exact: true }).check();
    await expect(page.getByLabel("Brassards brindecieux", { exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Enregistrer mes SR" }).click();

    await expect(page.getByRole("status")).toContainText("SR enregistrées.");
    await expect(itemRow(page, "Croc de Magmatus")).toContainText("1 SR");
    await expect(itemRow(page, "Croc de Magmatus")).toContainText("Ciel Gris");
  });

  test("the officer moves their reserve to another item", async ({ page, context }) => {
    await signInAs(context, "officer");
    await page.goto(eventPage());
    await page.getByLabel("Croc de Magmatus", { exact: true }).uncheck();
    await page.getByLabel("Brassards brindecieux", { exact: true }).check();
    await page.getByRole("button", { name: "Enregistrer mes SR" }).click();
    await expect(itemRow(page, "Croc de Magmatus")).toContainText("0 SR");
    await expect(itemRow(page, "Brassards brindecieux")).toContainText("Ciel Gris");
  });

  test("a member who is not signed up sees the reserves but cannot reserve", async ({ page, context }) => {
    await signInAs(context, "member");
    await page.goto(eventPage());
    await expect(page.getByText("Inscrivez-vous à l'événement pour choisir vos SR.")).toBeVisible();
    await expect(page.getByLabel("Croc de Magmatus", { exact: true })).toBeDisabled();
    await expect(itemRow(page, "Brassards brindecieux")).toContainText("Ciel Gris");
    await expect(page.getByRole("button", { name: "Enregistrer mes SR" })).toHaveCount(0);
  });
});
