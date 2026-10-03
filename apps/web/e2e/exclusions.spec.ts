import { expect, test } from "@playwright/test";
import { readSeed, signInAs } from "./sessions";

const eventPage = () => `/evenements/${readSeed().signupEventId}`;

test.describe.serial("exclusions", () => {
  test("an officer excludes an item with a reason; it is recorded in the journal", async ({ page, context }) => {
    await signInAs(context, "officer");
    await page.goto(eventPage());
    await page.getByLabel("Objet", { exact: true }).selectOption({ label: "Jambières de Dirgehammer" });
    await page.getByLabel("Motif de l'exclusion (visible dans le journal)").fill("Réservé au tank principal");
    await page.getByRole("button", { name: "Exclure" }).click();
    await expect(page.getByRole("status")).toContainText("Objet exclu des SR.");
    await expect(page.getByRole("listitem").filter({ hasText: "Jambières de Dirgehammer" })).toContainText(
      "exclu par les officiers",
    );

    await page.getByRole("link", { name: "Journal" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Motif : Réservé au tank principal" })).toContainText(
      "Objet exclu des SR",
    );
  });

  test("a member does not see the officers' exclusion form", async ({ page, context }) => {
    await signInAs(context, "member");
    await page.goto(eventPage());
    await expect(page.getByRole("heading", { name: "Officiers · exclusions" })).toHaveCount(0);
  });
});
