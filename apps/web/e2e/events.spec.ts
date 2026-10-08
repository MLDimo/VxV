import { expect, test } from "@playwright/test";
import { RAIDER_ROLE, WEB_ENVIRONMENT } from "./environment";
import { discordEventMessage } from "./fakeDiscord";
import { readSeed, signInAs } from "./sessions";

test.describe.serial("raid events", () => {
  test("an officer creates an event on a raid for a role, shown on the Raid page, on Discord and in the journal", async ({
    page,
    context,
    request,
  }) => {
    await signInAs(context, "officer");
    await page.goto("/raid");
    await page.getByRole("link", { name: "Créer un événement" }).click();
    await page.getByLabel("Date et heure (heure de Paris)").fill("2030-12-12T21:00");
    await page.getByLabel("La salle des Thanes").check();
    await page.getByLabel("SR par joueur").fill("2");
    await page.getByLabel("Qui peut s'inscrire (rôle Discord)").selectOption({ label: RAIDER_ROLE });
    await page.getByLabel("Motif (visible dans le journal)").fill("Raid de test");
    await page.getByRole("button", { name: "Créer l'événement" }).click();

    await expect(page.getByRole("heading", { name: "La salle des Thanes" })).toBeVisible();
    await expect(page.getByText("jeudi 12 décembre 2030 à 21:00")).toBeVisible();
    await expect(page.getByText("2 SR par joueur", { exact: true })).toBeVisible();
    await expect(page.getByText("Réservé à Raideur R1", { exact: true })).toBeVisible();
    const message = await discordEventMessage(request, page.url().split("/").pop() ?? "");
    expect(message?.channelId).toBe(WEB_ENVIRONMENT.DISCORD_RAID_CHANNEL_ID);
    expect(message?.embed?.title).toBe("🄻🄰 🅂🄰🄻🄻🄴 🄳🄴🅂 🅃🄷🄰🄽🄴🅂");
    expect(message?.embed?.description).toContain(`👥 Réservé à <@&${readSeed().raiderRoleId}>`);

    await page.getByRole("link", { name: "Raid", exact: true }).click();
    await expect(
      page.getByRole("link", { name: /La salle des Thanes/ }).filter({ hasText: "12 décembre 2030" }),
    ).toContainText("Réservé à Raideur R1");
    await page.getByRole("link", { name: "Journal" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Motif : Raid de test" })).toContainText(
      "La salle des Thanes, le 12/12/2030 21:00, 2 SR par joueur. Réservé à Raideur R1",
    );
  });

  test("an officer sees why an event is refused", async ({ page, context }) => {
    await signInAs(context, "officer");
    await page.goto("/evenements/nouveau");
    await page.getByLabel("Date et heure (heure de Paris)").fill("2030-12-12T21:00");
    await page.getByLabel("Qui peut s'inscrire (rôle Discord)").selectOption({ label: "Tout le monde" });
    await page.getByLabel("Motif (visible dans le journal)").fill("Sans raid");
    await page.getByRole("button", { name: "Créer l'événement" }).click();
    await expect(page.getByRole("status")).toContainText("Choisissez au moins un raid.");
  });

  test("a member sees the event but cannot create one", async ({ page, context }) => {
    await signInAs(context, "member");
    await page.goto("/raid");
    await expect(
      page.getByRole("link", { name: /La salle des Thanes/ }).filter({ hasText: "12 décembre 2030" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Créer un événement" })).toHaveCount(0);
    await page.goto("/evenements/nouveau");
    await expect(page).toHaveURL(/\/$/);
  });
});
