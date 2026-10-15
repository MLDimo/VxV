import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

/** A capture: a PNG of 2 × 2 pixels. */
const CAPTURE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==",
  "base64",
);
const TITLE = "Ragnaros tombe : premier clear";

test.describe.serial("Hall of Fame", () => {
  test("a member proposes an exploit with its capture; it waits for an officer", async ({ page, context }) => {
    await signInAs(context, "member");
    await page.goto("/hall-of-fame");
    await page.getByRole("link", { name: "Proposer un exploit" }).click();
    await page.getByLabel("Titre du tableau").fill(TITLE);
    await page.getByLabel("Date").fill("2026-09-03");
    await page.getByLabel("Type").selectOption("raid");
    await page.getByLabel("Le récit").fill("Sept soirées de raid, et Ragnaros tombe enfin au 9e essai.");
    await page.getByLabel("La phrase de la soirée (facultative)").fill("NE BOUGEZ PLUS.");
    await page.getByLabel(/Quelques chiffres/).fill("9e essai\n63 wipes");
    await page
      .getByLabel(/Captures d'écran/)
      .setInputFiles({ name: "clear.png", mimeType: "image/png", buffer: CAPTURE });
    await expect(page.getByText("1 capture(s) prête(s).")).toBeVisible();
    await page.getByRole("button", { name: "Proposer l'exploit" }).click();
    await expect(page.getByRole("status")).toContainText("Proposition envoyée");
    await page.reload();
    await expect(page.getByRole("region", { name: "Mes propositions" })).toContainText("En attente d'un officier.");
  });

  test("an officer opens a chapter and hangs the painting, recorded in the journal", async ({ page, context }) => {
    await signInAs(context, "officer");
    await page.goto("/hall-of-fame");
    await page.getByRole("link", { name: /^Propositions/ }).click();
    const chapters = page.getByRole("region", { name: "Chapitres" });
    await chapters.getByLabel("Titre du chapitre").fill("Le Cœur du Magma");
    await chapters.getByLabel("Période (facultative)").fill("septembre 2026");
    await chapters.getByLabel("Motif (visible dans le journal)").fill("Nouvelle phase");
    await chapters.getByRole("button", { name: "Ouvrir le chapitre" }).click();
    await expect(chapters.getByRole("status")).toContainText("Chapitre ouvert.");
    await page.reload();
    const proposal = page.getByRole("region", { name: TITLE });
    await proposal.getByLabel("Rareté").selectOption("legendary");
    await proposal.getByLabel("Motif (visible dans le journal)").fill("Premier clear de la guilde");
    await proposal.getByRole("button", { name: "Mettre au mur" }).click();
    // The officer sees the painting on the wall.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITLE);
    await page.goto("/journal");
    await expect(page.getByRole("listitem").filter({ hasText: "Motif : Premier clear de la guilde" })).toContainText(
      "Tableau publié au Hall of Fame",
    );
  });

  test("the guild walks the corridor, opens the painting, says it was there and leaves a memory", async ({
    page,
    context,
  }) => {
    await signInAs(context, "member");
    await page.goto("/hall-of-fame");
    await expect(page.getByText("Le Cœur du Magma").first()).toBeVisible();
    await page.getByRole("link", { name: new RegExp(`Ouvrir le tableau : ${TITLE}`) }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITLE);
    await expect(page.getByText("Légendaire", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: `Capture : ${TITLE}` })).toBeVisible();
    await page.getByRole("button", { name: "J'y étais" }).click();
    await expect(page.getByRole("button", { name: "J'y étais ✓" })).toBeVisible();
    await page.getByLabel("Ton souvenir").fill("J'ai le clip si quelqu'un doute.");
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByRole("region", { name: "Commentaires" })).toContainText("J'ai le clip si quelqu'un doute.");
    await page.getByRole("link", { name: "Fermer" }).click();
    await page.getByRole("button", { name: /^Mes exploits/ }).click();
    await expect(page.getByRole("link", { name: new RegExp(`Ouvrir le tableau : ${TITLE}`) })).toBeVisible();
  });

  test("an officer refuses a proposal: its author reads why", async ({ page, context }) => {
    await signInAs(context, "member");
    await page.goto("/hall-of-fame/proposer");
    await page.getByLabel("Titre du tableau").fill("Le doublon");
    await page.getByLabel("Date").fill("2026-09-04");
    await page.getByLabel("Le récit").fill("La même soirée, racontée deux fois.");
    await page.getByRole("button", { name: "Proposer l'exploit" }).click();
    await expect(page.getByRole("status")).toContainText("Proposition envoyée");

    await signInAs(context, "officer");
    await page.goto("/hall-of-fame/propositions");
    const proposal = page.getByRole("region", { name: "Le doublon" });
    await proposal.getByLabel("Motif du refus (visible dans le journal)").fill("Doublon du tableau de Ragnaros");
    await proposal.getByRole("button", { name: "Refuser" }).click();
    await expect(page.getByRole("region", { name: "Le doublon" })).toHaveCount(0);

    await signInAs(context, "member");
    await page.goto("/hall-of-fame/proposer");
    await expect(page.getByRole("region", { name: "Mes propositions" })).toContainText(
      "Refusée : Doublon du tableau de Ragnaros",
    );
  });
});
