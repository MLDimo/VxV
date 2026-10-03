import { expect, test } from "@playwright/test";
import { readSeed, signInAs } from "./sessions";

test("the soft reserve board shows the SR+ bonus earned at previous raids", async ({ page, context }) => {
  await signInAs(context, "member");
  await page.goto(`/evenements/${readSeed().bonusEventId}`);
  const reserved = page.getByRole("listitem").filter({ hasText: "Jambières de Dirgehammer" });
  await expect(reserved).toContainText("Dune Sable");
  await expect(reserved).toContainText("SR+ +10");
  await expect(page.getByText("SR+ : +10 au roll pour chaque raid précédent")).toBeVisible();
});
