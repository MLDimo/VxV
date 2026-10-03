import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

test("the history lists who received the soft-reserved items, and only those", async ({ page, context }) => {
  await signInAs(context, "member");
  await page.goto("/");
  await page.getByRole("link", { name: "Historique" }).click();
  const loot = page.getByRole("listitem").filter({ hasText: "Bottines du golem protecteur" });
  await expect(loot).toContainText("reçu par Dune Sable");
  await expect(loot).toContainText("SR respectée");
  await expect(loot).toContainText("Réservé par Dune Sable");
  await expect(page.getByText("Jambières de Dirgehammer")).toHaveCount(0);
});
