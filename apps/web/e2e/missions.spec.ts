import { expect, test } from "@playwright/test";
import { linkCompanion } from "./companionLink";
import { WEB_ENVIRONMENT } from "./environment";
import { discordMessages } from "./fakeDiscord";
import { readSeed, signInAs } from "./sessions";

const DAY_MS = 24 * 60 * 60 * 1000;
const TITLE = "Le Grand Pêcheur";

/** A datetime-local value in the guild's time zone. */
function parisWallClock(date: Date): string {
  return date.toLocaleString("sv-SE", { timeZone: "Europe/Paris" }).replace(" ", "T").slice(0, 16);
}

const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

// The tests build on each other: the mission the officer publishes, then the counters the companions bring.
let missionId = "";

test.describe.serial("missions", () => {
  test("an officer publishes a quest on the website: its page, its Discord message and the journal", async ({
    page,
    context,
    request,
  }) => {
    await signInAs(context, "officer");
    await page.goto("/quetes");
    await page.getByRole("link", { name: "Publier une quête" }).click();
    await page.getByLabel("Type (compteur du jeu)").selectOption("fishing");
    await page.getByLabel("Titre").fill(TITLE);
    await page.getByLabel(/^Récompense \(po\)/).fill("2000");
    await page.getByLabel("Début (heure de Paris)").fill(parisWallClock(new Date(Date.now() - DAY_MS)));
    await page.getByLabel("Durée (jours)").fill("7");
    await page.getByLabel("Motif (visible dans le journal)").fill("Mission de la semaine");
    await page.getByRole("button", { name: "Publier la mission" }).click();
    await expect(page).toHaveURL(/\/quetes\/[0-9a-f-]{36}$/);
    missionId = page.url().split("/").pop() ?? "";
    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();

    const message = (await discordMessages(request)).find((candidate) =>
      JSON.stringify(candidate.body).includes(`/quetes/${missionId}"`),
    );
    expect(message?.channelId).toBe(WEB_ENVIRONMENT.DISCORD_MISSIONS_CHANNEL_ID);

    await page.getByRole("link", { name: "Journal" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Motif : Mission de la semaine" })).toContainText(
      "Publication d'une mission",
    );
  });

  test("an officer's companion brings the counters: the ranking follows on the website and on Discord", async ({
    page,
    context,
    request,
  }) => {
    const token = await linkCompanion(page, context, request, "officer");
    const now = new Date();
    const upload = await request.post("/api/compagnon/envoi", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        raidLogs: [],
        characters: [],
        changes: [],
        counters: [
          { name: "Ciel Gris", type: "fishing", value: 100, at: seconds(new Date(now.getTime() - 2 * DAY_MS)) },
          { name: "Ciel Gris", type: "fishing", value: 140, at: seconds(new Date(now.getTime() - 60_000)) },
          // Relayed by the officer: Dune Sable has no companion.
          { name: "Dune Sable", type: "fishing", value: 0, at: seconds(new Date(now.getTime() - DAY_MS / 2)) },
          { name: "Dune Sable", type: "fishing", value: 52, at: seconds(new Date(now.getTime() - 30_000)) },
        ],
      },
    });
    expect(((await upload.json()) as { counters: string }).counters).toBe("4 nouveaux relevés de compteurs.");

    await signInAs(context, "member");
    await page.goto("/quetes");
    const ranking = page.getByRole("list", { name: `Classement · ${TITLE}` });
    await expect(ranking.getByRole("listitem").nth(0)).toContainText("Dune Sable");
    await expect(ranking.getByRole("listitem").nth(0)).toContainText("52");
    await expect(ranking.getByRole("listitem").nth(1)).toContainText("Ciel Gris");
    await expect(ranking.getByRole("listitem").nth(1)).toContainText("40");
    // The member has no score yet: their progress says so, without a place.
    const quest = page.getByRole("region", { name: TITLE });
    await expect(quest.getByText("Ta progression")).toBeVisible();
    await expect(quest.getByText("Rien encore : l'addon VXV relève ton compteur en jeu.")).toBeVisible();

    const message = (await discordMessages(request)).find((candidate) =>
      JSON.stringify(candidate.body).includes(`/quetes/${missionId}"`),
    );
    expect(JSON.stringify(message?.body)).toContain("1. Dune Sable — 52 pêches réussies");

    await page.goto("/");
    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
    await expect(page.getByText("En tête : Dune Sable (52)")).toBeVisible();
  });

  test("an officer validates an ended quest; the treasurer hands the reward over from the cash", async ({
    page,
    context,
  }) => {
    const ended = `/quetes/${readSeed().endedMissionId}`;
    await signInAs(context, "member");
    await page.goto(ended);
    await expect(page.getByRole("button", { name: "Valider le résultat" })).toHaveCount(0);

    // The test officer is also the treasurer.
    await signInAs(context, "officer");
    await page.goto(ended);
    await page.getByLabel("Motif (visible dans le journal)").fill("Classement vérifié");
    await page.getByRole("button", { name: "Valider le résultat" }).click();
    const rewards = page.getByRole("region", { name: "Récompenses" });
    await expect(rewards).toContainText("1er · Ciel Gris · 700 po · à verser");
    await rewards.getByRole("button", { name: "Versée" }).click();
    await expect(page.getByRole("region", { name: "Récompenses" })).toContainText("700 po · versée");
    await expect(page.getByText("ACCOMPLIE", { exact: true })).toBeVisible();

    await page.goto("/journal");
    await expect(page.getByText("Mission « Le Chasseur de têtes » : récompense du 1er (Ciel Gris)")).toBeVisible();
    await page.goto("/quetes");
    await expect(page.getByRole("region", { name: "Hall of fame" })).toContainText("Ciel Gris");
    // Ranking › Quêtes: 3 points for the quest won.
    await page.goto("/ranking");
    await page.getByRole("link", { name: "Quêtes", exact: true }).last().click();
    await expect(page).toHaveURL(/\/ranking\/quetes$/);
    await expect(
      page.getByRole("list", { name: "Podium" }).getByRole("listitem").filter({ hasText: "Ciel" }),
    ).toContainText("3");
  });
});
