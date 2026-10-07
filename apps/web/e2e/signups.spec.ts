import { expect, test } from "@playwright/test";
import { giveDiscordRole } from "./fakeDiscord";
import { readSeed, signInAs } from "./sessions";

test.describe.serial("sign-ups", () => {
  const eventPage = () => `/evenements/${readSeed().signupEventId}`;

  test("a member without character is sent to link one first", async ({ page, context }) => {
    await signInAs(context, "newcomer");
    await page.goto(eventPage());
    await expect(page.getByText("liez d'abord un personnage de la guilde")).toBeVisible();
    await expect(page.getByRole("link", { name: "Mes personnages" }).last()).toBeVisible();
  });

  test("an officer signs up as tank and appears in the composition", async ({ page, context }) => {
    await signInAs(context, "officer");
    await page.goto(eventPage());
    await page.getByLabel("Personnage").selectOption({ label: "Ciel Gris" });
    await page.getByLabel("Rôle").selectOption({ label: "Tank" });
    await page.getByLabel("Spécialisation").fill("Protection");
    await page.getByLabel("Statut").selectOption({ label: "Présent" });
    await page.getByRole("button", { name: "M'inscrire" }).click();

    await expect(page.getByRole("status")).toContainText("Inscription enregistrée.");
    await expect(page.getByRole("group", { name: "Tank" })).toContainText("1Ciel Gris");
    const row = page.getByRole("listitem").filter({ hasText: "Ciel Gris" });
    await expect(row).toContainText("Protection");
    await expect(row).toContainText("Présent");
  });

  test("the officer updates their status to late", async ({ page, context }) => {
    await signInAs(context, "officer");
    await page.goto(eventPage());
    await page.getByLabel("Statut").selectOption({ label: "En retard" });
    await page.getByRole("button", { name: "Mettre à jour mon inscription" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Ciel Gris" })).toContainText("En retard");
    await expect(page.getByRole("group", { name: "Tank" })).toContainText("1Ciel Gris");
  });

  test("a member signs up to a raid reserved to a role once Discord gives it to them", async ({
    page,
    context,
    request,
  }) => {
    await signInAs(context, "lockedMember");
    await page.goto(`/evenements/${readSeed().reservedEventId}`);
    await expect(page.getByText("Réservé à Raideur R1", { exact: true })).toBeVisible();
    const signUp = async () => {
      await page.getByLabel("Personnage").selectOption({ label: "Dune Sable" });
      await page.getByLabel("Rôle").selectOption({ label: "DPS" });
      await page.getByLabel("Spécialisation").fill("Précision");
      await page.getByLabel("Statut").selectOption({ label: "Présent" });
      await page.getByRole("button", { name: "M'inscrire" }).click();
    };

    await signUp();
    await expect(page.getByRole("status")).toContainText("Ce raid est réservé au rôle Discord « Raideur R1 ».");
    await giveDiscordRole(request, "500", readSeed().raiderRoleId);
    await signUp();
    await expect(page.getByRole("status")).toContainText("Inscription enregistrée.");
    await expect(page.getByRole("listitem").filter({ hasText: "Dune Sable" })).toContainText("Précision");
  });
});
