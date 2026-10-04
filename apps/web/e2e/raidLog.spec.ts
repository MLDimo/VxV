import { expect, test } from "@playwright/test";
import { discordMessages } from "./fakeDiscord";
import { readSeed, signInAs } from "./sessions";

const eventPage = () => `/evenements/${readSeed().raidLogEventId}`;
const LOG_LABEL = "Journal du raid copié depuis l'addon";
const REASON_LABEL = "Motif de l'import (visible dans le journal)";
const FALDRIM = 3493;
const BRASSARDS = 271096;
const KILL = Date.UTC(2031, 3, 2, 21) / 1000;

function raidLog(eventId: string): string {
  return [
    "VXV-LOG-1",
    `R;${eventId};${String(KILL - 600)};${String(KILL)}`,
    `K;${String(FALDRIM)};${String(KILL)}`,
    "P;Ciel Gris",
    "P;Dune Sable",
    `L;${String(FALDRIM)};${String(BRASSARDS)};Ciel Gris;loot_council;${String(KILL + 60)}`,
    "D;Dune Sable;2",
  ].join("\n");
}

test.describe.serial("raid log", () => {
  test("lists every problem of a damaged log", async ({ page, context }) => {
    await signInAs(context, "officer");
    await page.goto(eventPage());
    await page.getByLabel(LOG_LABEL).fill(`VXV-LOG-1\nR;${readSeed().raidLogEventId};;\nL;boss;1`);
    await page.getByLabel(REASON_LABEL).fill("Essai");
    await page.getByRole("button", { name: "Importer le journal" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Ligne 3 illisible" })).toBeVisible();
  });

  test("an officer imports the log: history, journal and the recap on Discord", async ({ page, context, request }) => {
    await signInAs(context, "officer");
    await page.goto(eventPage());
    await page.getByLabel(LOG_LABEL).fill(raidLog(readSeed().raidLogEventId));
    await page.getByLabel(REASON_LABEL).fill("Raid du mercredi");
    await page.getByRole("button", { name: "Importer le journal" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Journal importé : 1 boss tué, 2 présents, 1 objet ajouté." }),
    ).toBeVisible();

    const recap = (await discordMessages(request)).find((message) => {
      const content = String(message.body.content);
      return content.startsWith("📜") && content.includes(readSeed().raidLogEventId);
    });
    expect(recap?.body.content).toContain("⚔️ 1 boss tué en 10 min : Faldrim Courbenclume");
    expect(recap?.body.content).toContain("💰 Brassards brindecieux → Ciel Gris (Loot council)");
    expect(recap?.body.content).toContain("💀 Morts : Dune Sable ×2");

    await page.getByRole("link", { name: "Historique" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Brassards brindecieux" }).first()).toContainText(
      "reçu par Ciel Gris",
    );
    await page.getByRole("link", { name: "Journal" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Motif : Raid du mercredi" }).first()).toBeVisible();
    await expect(
      page
        .getByRole("listitem")
        .filter({ hasText: "Objet « Brassards brindecieux » attribué à Ciel Gris au loot council" }),
    ).toBeVisible();
  });

  test("a member does not see the import of the raid log", async ({ page, context }) => {
    await signInAs(context, "member");
    await page.goto(eventPage());
    await expect(page.getByLabel(LOG_LABEL)).toHaveCount(0);
  });
});
