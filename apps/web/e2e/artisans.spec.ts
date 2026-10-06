import { expect, test } from "@playwright/test";
import { linkCompanion } from "./companionLink";
import { signInAs } from "./sessions";

const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

/** A character's first aid as the addon writes it (VXV-METIERS), its recipes read when its window was opened. */
function firstAid(name: string, level: number, at: Date): string {
  return [
    "VXV-METIERS-1",
    `C;${name}`,
    `P;129;Secourisme;${String(level)};75;${String(seconds(at))};${String(seconds(at))}`,
    "R;129;3275;Bandage en lin",
    "R;129;1244431;Potion de soins mineure",
  ].join("\n");
}

test("an officer's companion brings the professions; a member finds who can make an item", async ({
  page,
  context,
  request,
}) => {
  const token = await linkCompanion(page, context, request, "officer");
  const upload = await request.post("/api/compagnon/envoi", {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      raidLogs: [],
      characters: [],
      changes: [],
      counters: [],
      // The officer's own main, and Dune Sable relayed from the game.
      texts: {
        metiers: {
          "Ciel Gris": firstAid("Ciel Gris", 60, new Date()),
          "Dune Sable": firstAid("Dune Sable", 22, new Date()),
        },
      },
    },
  });
  expect(((await upload.json()) as { texts: string[] }).texts).toEqual(["Métiers : 2 mis à jour."]);

  await signInAs(context, "member");
  await page.goto("/");
  await page.getByRole("link", { name: "Artisans" }).first().click();
  await expect(page).toHaveURL(/\/artisans$/);
  await expect(page.getByRole("region", { name: "Annuaire" }).getByRole("article")).toContainText(["Secourisme"]);
  await page.getByLabel("Objet à fabriquer").fill("potion SOINS");
  await page.getByRole("button", { name: "Chercher" }).click();
  const results = page.getByRole("region", { name: "Résultats" });
  await expect(results.getByRole("heading", { name: "Potion de soins mineure" })).toBeVisible();
  const crafters = results.getByRole("list", { name: "Qui sait faire Potion de soins mineure" }).getByRole("listitem");
  await expect(crafters.filter({ hasText: "Ciel Gris" })).toContainText("Secourisme 60/75");
  await expect(crafters.filter({ hasText: "Dune Sable" })).toContainText("Secourisme 22/75");
});
