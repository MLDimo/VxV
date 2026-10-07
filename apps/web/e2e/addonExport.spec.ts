import { expect, test } from "@playwright/test";
import { readSeed, signInAs } from "./sessions";

const eventPage = () => `/evenements/${readSeed().lockedEventId}`;
const EXPORT_LABEL = "Données de l'événement pour l'addon";

test("an officer copies the event's data for the addon: officers, sign-ups, soft reserves and journal", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await signInAs(context, "officer");
  await page.goto(eventPage());
  const lines = (await page.getByLabel(EXPORT_LABEL).inputValue()).split("\n");
  expect(lines[0]).toBe("VXV-RAID-3");
  expect(lines[1]).toMatch(/;Ouvert à tous$/);
  expect(lines).toContain("O;Ciel Gris");
  expect(lines).toContain("I;271096;Brassards brindecieux;Faldrim Courbenclume;0");
  expect(lines).toContainEqual(expect.stringMatching(/^S;Dune Sable;[A-Z]+;dps;present;0;Précision;271096:0$/));
  expect(lines).toContainEqual(
    expect.stringMatching(/^J;\d+;.+;SR corrigées par un officier : .+;SR de départ des tests$/),
  );

  await page.getByRole("button", { name: "Copier" }).click();
  await expect(page.getByRole("status").filter({ hasText: "tape /vxv importer" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(lines.join("\n"));
});

test("a member does not get the event's data for the addon", async ({ page, context }) => {
  await signInAs(context, "member");
  await page.goto(eventPage());
  await expect(page.getByLabel(EXPORT_LABEL)).toHaveCount(0);
});
