import { expect, test } from "@playwright/test";
import { linkCompanion } from "./companionLink";
import { WEB_ENVIRONMENT } from "./environment";
import { discordMessages } from "./fakeDiscord";
import { signInAs } from "./sessions";

const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

/** Ciel Gris challenged Dune Sable for 1 500 po; Dune rolls first and rolls 1 at the third roll. */
function game(at: Date): string {
  return [
    "VXV-DEATHROLL-1",
    `G;Ciel Gris#${String(seconds(at))}#1;Ciel Gris;Dune Sable;1500;1000;${String(seconds(at))};${String(seconds(at) + 120)}`,
    "R;Dune Sable;1000;412",
    "R;Ciel Gris;412;87",
    "R;Dune Sable;87;0",
  ].join("\n");
}

test("a deathroll played in game: Discord tells it, the loser owes the stake until the winner confirms", async ({
  page,
  context,
  request,
}) => {
  const token = await linkCompanion(page, context, request, "officer");
  const upload = await request.post("/api/compagnon/envoi", {
    headers: { Authorization: `Bearer ${token}` },
    data: { raidLogs: [], characters: [], changes: [], counters: [], texts: { deathroll: { g1: game(new Date()) } } },
  });
  expect(((await upload.json()) as { texts: string[] }).texts).toEqual([
    "Deathroll Ciel Gris contre Dune Sable enregistré.",
  ]);
  const message = (await discordMessages(request)).find((candidate) =>
    JSON.stringify(candidate.body).includes("/paris/deathroll"),
  );
  expect(message?.channelId).toBe(WEB_ENVIRONMENT.DISCORD_DEATHROLLS_CHANNEL_ID);
  expect(JSON.stringify(message?.body)).toContain("Ciel Gris bat Dune Sable en 3 rolls");

  await signInAs(context, "lockedMember");
  await page.goto("/paris");
  await page.getByRole("navigation", { name: "Le Dé Pipé" }).getByRole("link", { name: "Deathroll" }).click();
  await expect(page.getByRole("region", { name: "Mes dettes de deathroll" })).toContainText(
    /Tu dois 1\s500\spo à Ciel Gris/,
  );

  await signInAs(context, "officer");
  await page.goto("/paris/deathroll");
  const debts = page.getByRole("region", { name: "Mes dettes de deathroll" });
  await expect(debts).toContainText(/Dune Sable te doit 1\s500\spo/);
  await debts.getByRole("button", { name: "Paiement reçu" }).click();
  await expect(page.getByRole("region", { name: "Mes dettes de deathroll" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Dernières parties" })).toContainText("1000 : 412 → 87 → 0");

  await page.goto("/ranking");
  await page.getByRole("link", { name: "Deathroll" }).click();
  const first = page.getByRole("list", { name: "Podium" }).getByRole("listitem").filter({ hasText: "Ciel" });
  await expect(first).toContainText(/\+1\s500\spo/);
});
