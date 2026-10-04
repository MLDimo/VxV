import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

const REASON_LABEL = "Motif de la correction (visible dans le journal)";

test("an officer corrects who received a loot and how, with the reason in the journal", async ({ page, context }) => {
  await signInAs(context, "officer");
  await page.goto("/historique");
  const loot = page.getByLabel("Loot à corriger");
  const option = loot.locator("option", { hasText: "Brassards brindecieux · Ciel Gris (Roll libre)" });
  await loot.selectOption((await option.getAttribute("value")) ?? "");
  await page.getByLabel("Reçu par").selectOption({ label: "Dune Sable" });
  await page.getByLabel("Attribué par").selectOption({ label: "SR" });
  await page.getByLabel(REASON_LABEL).fill("Erreur de clic du maître du butin");
  await page.getByRole("button", { name: "Corriger" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Loot corrigé." })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Brassards brindecieux" }).first()).toContainText(
    "reçu par Dune Sable",
  );

  await page.getByRole("link", { name: "Journal" }).click();
  const entry = page.getByRole("listitem").filter({ hasText: "Motif : Erreur de clic du maître du butin" });
  await expect(entry).toContainText("Loot corrigé par un officier");
  await expect(entry).toContainText("Ciel Gris (Roll libre) → Dune Sable (SR)");
});

test("a member does not see the correction of the loots", async ({ page, context }) => {
  await signInAs(context, "member");
  await page.goto("/historique");
  await expect(page.getByLabel("Loot à corriger")).toHaveCount(0);
});
