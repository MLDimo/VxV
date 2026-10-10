import { expect, test, type Page } from "@playwright/test";
import { readSeed, signInAs } from "./sessions";

const eventPage = () => `/evenements/${readSeed().softReserveEventId}`;
const itemRow = (page: Page, name: string) => page.getByRole("listitem").filter({ hasText: name });
/** The viewer's own soft reserve boxes (officers also see the correction form, with the same item names). */
const myBox = (page: Page, name: string) =>
  page.getByRole("form", { name: "Mes SR" }).getByLabel(name, { exact: true });

test.describe.serial("soft reserves", () => {
  test("a signed-up officer reserves an item within the allowance", async ({ page, context }) => {
    await signInAs(context, "officer");
    await page.goto(eventPage());
    await expect(page.getByText("Vous avez droit à 1 SR : 0 choisie(s).")).toBeVisible();
    await myBox(page, "Croc de Magmatus").check();
    await expect(myBox(page, "Brassards brindecieux")).toBeDisabled();
    await page.getByRole("button", { name: "Enregistrer mes SR" }).click();

    await expect(page.getByRole("status")).toContainText("SR enregistrées.");
    await expect(itemRow(page, "Croc de Magmatus")).toContainText("1 SR");
    await expect(itemRow(page, "Croc de Magmatus")).toContainText("Ciel Gris");
  });

  test("the officer moves their reserve to another item", async ({ page, context }) => {
    await signInAs(context, "officer");
    await page.goto(eventPage());
    await myBox(page, "Croc de Magmatus").uncheck();
    await myBox(page, "Brassards brindecieux").check();
    await page.getByRole("button", { name: "Enregistrer mes SR" }).click();
    await expect(itemRow(page, "Croc de Magmatus")).toContainText("0 SR");
    await expect(itemRow(page, "Brassards brindecieux")).toContainText("Ciel Gris");
  });

  test("a priest reserves among the items a priest may equip: no box on mail nor leather", async ({
    page,
    context,
  }) => {
    await signInAs(context, "priest");
    await page.goto(eventPage());
    await expect(myBox(page, "Croc de Magmatus")).toBeEnabled();
    await expect(myBox(page, "Brassards brindecieux")).toBeEnabled();
    for (const name of ["Bottines du golem protecteur", "Jambières de Dirgehammer"]) {
      await expect(myBox(page, name)).toHaveCount(0);
      await expect(itemRow(page, name)).toContainText("ne s'équipe pas avec ta classe");
    }
  });

  test("a member who is not signed up sees the reserves but cannot reserve", async ({ page, context }) => {
    await signInAs(context, "member");
    await page.goto(eventPage());
    await expect(page.getByText("Inscrivez-vous à l'événement pour choisir vos SR.")).toBeVisible();
    await expect(myBox(page, "Croc de Magmatus")).toBeDisabled();
    await expect(itemRow(page, "Brassards brindecieux")).toContainText("Ciel Gris");
    await expect(page.getByRole("button", { name: "Enregistrer mes SR" })).toHaveCount(0);
  });
});
