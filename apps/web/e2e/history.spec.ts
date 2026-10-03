import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

test("the history lists every loot with how it was given, and can keep only the soft reserves", async ({
  page,
  context,
}) => {
  await signInAs(context, "member");
  await page.goto("/");
  await page.getByRole("link", { name: "Historique" }).click();
  const softReserved = page.getByRole("listitem").filter({ hasText: "Bottines du golem protecteur" });
  await expect(softReserved).toContainText("reçu par Dune Sable");
  await expect(softReserved).toContainText("SR respectée");
  await expect(softReserved).toContainText("Réservé par Dune Sable");
  const freeRoll = page.getByRole("listitem").filter({ hasText: "Jambières de Dirgehammer" });
  await expect(freeRoll).toContainText("reçu par Ciel Gris");
  await expect(freeRoll).toContainText("Roll libre");

  await page.getByRole("link", { name: "SR uniquement" }).click();
  await expect(page.getByRole("link", { name: "SR uniquement" })).toHaveAttribute("aria-current", "page");
  await expect(softReserved).toContainText("SR respectée");
  await expect(page.getByText("Jambières de Dirgehammer")).toHaveCount(0);
});
