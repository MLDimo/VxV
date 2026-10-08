import { expect, test } from "@playwright/test";
import { WEB_ENVIRONMENT } from "./environment";
import { discordEventMessage } from "./fakeDiscord";
import { signInAs } from "./sessions";

test.describe.serial("PvP outings", () => {
  let outingPath = "";

  test("an officer plans a PvP outing for a role, announced in the PvP channel and journaled", async ({
    page,
    context,
    request,
  }) => {
    await signInAs(context, "officer");
    await page.goto("/pvp");
    await page.getByRole("link", { name: "Créer un événement PvP" }).click();
    await page.getByLabel("Titre de l'événement").fill("Raid sur Astranaar");
    await page.getByLabel("Date et heure (heure de Paris)").fill("2031-05-08T21:00");
    await page.getByLabel("Qui peut s'inscrire (rôle Discord)").selectOption({ label: "Tout le monde" });
    await page.getByLabel("Motif (visible dans le journal)").fill("Sortie de test");
    await page.getByRole("button", { name: "Créer l'événement" }).click();

    await expect(page).toHaveURL(/\/pvp\/evenements\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "Raid sur Astranaar" })).toBeVisible();
    await expect(page.getByText("Ouvert à tous", { exact: true })).toBeVisible();
    outingPath = new URL(page.url()).pathname;
    const message = await discordEventMessage(request, outingPath.split("/").pop() ?? "");
    expect(message?.channelId).toBe(WEB_ENVIRONMENT.DISCORD_PVP_CHANNEL_ID);
    expect(message?.embed?.title).toBe("Raid sur Astranaar");
    expect(message?.embed?.description).not.toContain("SR");

    await page.goto("/pvp");
    await expect(page.getByRole("link", { name: /Raid sur Astranaar/ })).toContainText("Ouvert à tous");
    await page.goto("/raid");
    await expect(page.getByRole("link", { name: /Raid sur Astranaar/ })).toHaveCount(0);
    await page.goto("/journal");
    await expect(page.getByRole("listitem").filter({ hasText: "Motif : Sortie de test" })).toContainText(
      "Raid sur Astranaar, le 08/05/2031 21:00. Ouvert à tous",
    );
  });

  test("a member signs up to the outing, whose raid address leads to its PvP page", async ({ page, context }) => {
    await signInAs(context, "lockedMember");
    await page.goto(outingPath.replace("/pvp", ""));
    await expect(page).toHaveURL(new RegExp(`${outingPath}$`));
    await page.getByLabel("Personnage").selectOption({ label: "Dune Sable" });
    await page.getByLabel("Rôle").selectOption({ label: "DPS" });
    await page.getByLabel("Spécialisation").fill("Survie");
    await page.getByLabel("Statut").selectOption({ label: "Présent" });
    await page.getByRole("button", { name: "M'inscrire" }).click();
    await expect(page.getByRole("status")).toContainText("Inscription enregistrée.");
    await expect(page.getByRole("listitem").filter({ hasText: "Dune Sable" })).toContainText("Survie");
  });

  test("a member cannot plan an outing", async ({ page, context }) => {
    await signInAs(context, "member");
    await page.goto("/pvp");
    await expect(page.getByRole("link", { name: "Créer un événement PvP" })).toHaveCount(0);
    await page.goto("/pvp/nouveau");
    await expect(page).toHaveURL(/\/$/);
  });
});
