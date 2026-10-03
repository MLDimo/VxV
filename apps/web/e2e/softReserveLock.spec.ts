import { expect, test } from "@playwright/test";
import { readSeed, signInAs } from "./sessions";

const eventPage = () => `/evenements/${readSeed().lockedEventId}`;

test.describe.serial("soft reserve lock", () => {
  test("a member can no longer change their reserves 30 minutes before the raid", async ({ page, context }) => {
    await signInAs(context, "lockedMember");
    await page.goto(eventPage());
    await expect(
      page.getByText(/SR verrouillées depuis le .* seul un officier peut encore les modifier\./),
    ).toBeVisible();
    await expect(page.getByLabel("Croc de Magmatus", { exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Enregistrer mes SR" })).toHaveCount(0);
  });

  test("an officer corrects the player's reserves with a reason, recorded in the journal", async ({
    page,
    context,
  }) => {
    await signInAs(context, "officer");
    await page.goto(eventPage());
    await page.getByLabel("Joueur").selectOption({ label: "Dune Sable" });
    const reserves = page.getByRole("group", { name: "Ses SR" });
    await expect(reserves.getByLabel("Brassards brindecieux")).toBeChecked();
    await reserves.getByLabel("Brassards brindecieux").uncheck();
    await reserves.getByLabel("Croc de Magmatus").check();
    await page.getByLabel("Motif de la correction (visible dans le journal)").fill("Échange demandé en vocal");
    await page.getByRole("button", { name: "Corriger ses SR" }).click();

    await expect(page.getByRole("status").filter({ hasText: "SR du joueur corrigées." })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Croc de Magmatus" }).first()).toContainText(
      "Dune Sable",
    );
    await page.getByRole("link", { name: "Journal" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Motif : Échange demandé en vocal" })).toContainText(
      "SR de Dune Sable",
    );
  });
});
