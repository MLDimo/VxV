import { expect, test } from "@playwright/test";
import { linkCompanion } from "./companionLink";
import { signInAs } from "./sessions";

const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

/** Ciel Gris challenged Dune Sable for 200 po: a draw, then Ciel's paper wraps Dune's rock twice. */
function game(at: Date): string {
  return [
    "VXV-CHIFOUMI-1",
    `G;Ciel Gris#${String(seconds(at))}#1;Ciel Gris;Dune Sable;200;${String(seconds(at))};${String(seconds(at) + 90)}`,
    "M;ciseaux;ciseaux",
    "M;feuille;pierre",
    "M;feuille;pierre",
  ].join("\n");
}

test("a Chi Fou Mi played in game: the loser owes the stake until the winner confirms, the ranking follows", async ({
  page,
  context,
  request,
}) => {
  const token = await linkCompanion(page, context, request, "officer");
  const upload = await request.post("/api/compagnon/envoi", {
    headers: { Authorization: `Bearer ${token}` },
    data: { raidLogs: [], characters: [], changes: [], counters: [], texts: { chifoumi: { c1: game(new Date()) } } },
  });
  expect(((await upload.json()) as { texts: string[] }).texts).toEqual([
    "Chi Fou Mi Ciel Gris contre Dune Sable enregistré.",
  ]);

  await signInAs(context, "lockedMember");
  await page.goto("/paris");
  await page.getByRole("navigation", { name: "Le Dé Pipé" }).getByRole("link", { name: "Chi Fou Mi" }).click();
  await expect(page.getByRole("region", { name: "Mes dettes de Chi Fou Mi" })).toContainText(
    /Tu dois 200\spo à Ciel Gris/,
  );

  await signInAs(context, "officer");
  await page.goto("/paris/chifoumi");
  const debts = page.getByRole("region", { name: "Mes dettes de Chi Fou Mi" });
  await expect(debts).toContainText(/Dune Sable te doit 200\spo/);
  await debts.getByRole("button", { name: "Paiement reçu" }).click();
  await expect(page.getByRole("region", { name: "Mes dettes de Chi Fou Mi" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Dernières parties" })).toContainText(
    "Ciseaux contre Ciseaux · Feuille contre Pierre · Feuille contre Pierre",
  );

  await page.goto("/ranking");
  await page.getByRole("link", { name: "Chi Fou Mi" }).click();
  const first = page.getByRole("list", { name: "Podium" }).getByRole("listitem").filter({ hasText: "Ciel" });
  await expect(first).toContainText(/\+200\spo/);
});
