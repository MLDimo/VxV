import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

test.describe.serial("raid events", () => {
  test("an officer creates an event on a raid, shown on the home page and in the journal", async ({
    page,
    context,
  }) => {
    await signInAs(context, "officer");
    await page.goto("/");
    await page.getByRole("link", { name: "Créer un événement" }).click();
    await page.getByLabel("Date et heure (heure de Paris)").fill("2030-12-12T21:00");
    await page.getByLabel("La salle des Thanes").check();
    await page.getByLabel("SR par joueur").fill("2");
    await page.getByLabel("Motif (visible dans le journal)").fill("Raid de test");
    await page.getByRole("button", { name: "Créer l'événement" }).click();

    await expect(page.getByRole("heading", { name: "La salle des Thanes" })).toBeVisible();
    await expect(page.getByText("jeudi 12 décembre 2030 à 21:00")).toBeVisible();
    await expect(page.getByText("2 SR par joueur")).toBeVisible();

    await page.getByRole("link", { name: "VXV" }).click();
    await expect(
      page.getByRole("link", { name: /La salle des Thanes/ }).filter({ hasText: "12 décembre 2030" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Journal" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Motif : Raid de test" })).toContainText(
      "La salle des Thanes, le 12/12/2030 21:00, 2 SR par joueur",
    );
  });

  test("an officer sees why an event is refused", async ({ page, context }) => {
    await signInAs(context, "officer");
    await page.goto("/evenements/nouveau");
    await page.getByLabel("Date et heure (heure de Paris)").fill("2030-12-12T21:00");
    await page.getByLabel("Motif (visible dans le journal)").fill("Sans raid");
    await page.getByRole("button", { name: "Créer l'événement" }).click();
    await expect(page.getByRole("status")).toContainText("Choisissez au moins un raid.");
  });

  test("a member sees the event but cannot create one", async ({ page, context }) => {
    await signInAs(context, "member");
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /La salle des Thanes/ }).filter({ hasText: "12 décembre 2030" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Créer un événement" })).toHaveCount(0);
    await page.goto("/evenements/nouveau");
    await expect(page).toHaveURL(/\/$/);
  });
});
