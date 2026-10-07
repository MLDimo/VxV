import { expect, test } from "@playwright/test";
import { linkCompanion, linkPage, pkce, PORT, STATE } from "./companionLink";
import { SEED_ROSTER, WEB_ENVIRONMENT } from "./environment";
import { readSeed, signInAs } from "./sessions";

test("a member links the companion, which then acts for them until unlinked", async ({ page, context, request }) => {
  await signInAs(context, "member");
  const { verifier, challenge } = pkce();
  // The browser hands the code to the companion listening on this computer.
  let handedTo: URL | undefined;
  await page.route(`http://127.0.0.1:${PORT}/**`, async (route) => {
    handedTo = new URL(route.request().url());
    await route.fulfill({ contentType: "text/html; charset=utf-8", body: "<p>Compagnon relié</p>" });
  });
  await page.goto(linkPage(challenge));
  await expect(page.getByText("agira au nom de Membre Test")).toBeVisible();
  await page.getByRole("button", { name: "Relier le compagnon" }).click();
  await expect(page.getByText("Compagnon relié")).toBeVisible();
  expect(handedTo?.pathname).toBe("/retour");
  expect(handedTo?.searchParams.get("etat")).toBe(STATE);

  const exchange = await request.post("/api/compagnon/jeton", {
    data: { code: handedTo?.searchParams.get("code"), verifier },
  });
  expect(exchange.status()).toBe(200);
  const { token, member } = (await exchange.json()) as { token: string; member: { name: string } };
  expect(member.name).toBe("Membre Test");
  const authorization = { Authorization: `Bearer ${token}` };
  const me = await request.get("/api/compagnon/moi", { headers: authorization });
  expect(await me.json()).toEqual({ name: "Membre Test", roles: ["member"] });

  expect((await request.delete("/api/compagnon/jeton", { headers: authorization })).status()).toBe(204);
  const afterwards = await request.get("/api/compagnon/moi", { headers: authorization });
  expect(afterwards.status()).toBe(401);
});

test("the companion brings the next event to the addon, as an officer would paste it", async ({
  page,
  context,
  request,
}) => {
  const token = await linkCompanion(page, context, request);
  const response = await request.get("/api/compagnon/donnees", { headers: { Authorization: `Bearer ${token}` } });
  const { raid, paris, quetes, titres } = (await response.json()) as {
    raid: { text: string; title: string; startsAt: string };
    paris: { text: string };
    quetes: { text: string };
    titres: { text: string };
  };
  // The soonest event is the one starting 10 minutes after the seed.
  expect(raid.title).toBe("La salle des Thanes");
  expect(raid.text.split("\n").slice(0, 2)).toEqual([
    "VXV-RAID-2",
    expect.stringMatching(`^E;${readSeed().lockedEventId};`),
  ]);
  // The bets come along, for Le Dé Pipé in game (P11.8).
  expect(paris.text.split("\n")[0]).toBe("VXV-PARIS-1");
  // And the missions, for Les Quêtes in game (P12.8).
  expect(quetes.text.split("\n")[0]).toBe("VXV-QUETES-1");
  // And the titles of the week, for the game's displays (P13.3).
  expect(titres.text.split("\n")[0]).toBe("VXV-TITRES-1");
  expect((await request.get("/api/compagnon/donnees")).status()).toBe(401);
});

test("an officer's companion sends the roster, the raid's record and the characters' look", async ({
  page,
  context,
  request,
}) => {
  const token = await linkCompanion(page, context, request, "officer");
  const night = Date.UTC(2031, 3, 9, 21) / 1000;
  const upload = {
    roster: { text: ["VXV-ROSTER-1", ...SEED_ROSTER].join("\n"), capturedAt: Math.floor(Date.now() / 1000) },
    raidLogs: [
      [
        "VXV-LOG-2",
        `R;${readSeed().companionEventId};${String(night)};${String(night + 3600)}`,
        `K;3493;${String(night + 1800)}`,
        "P;Ciel Gris",
        "P;Aubé Clairval",
      ].join("\n"),
    ],
    characters: [{ name: "Ciel Gris", race: "Orc", sex: 2 }],
    changes: [
      {
        id: "Ciel Gris#1796900000#1",
        eventId: readSeed().companionEventId,
        author: "Ciel Gris",
        kind: "signup",
        role: "tank",
        spec: "Protection",
        status: "present",
      },
      { id: "x", kind: "unknown" },
    ],
  };
  const headers = { Authorization: `Bearer ${token}` };
  const response = await request.post("/api/compagnon/envoi", { headers, data: upload });
  expect(await response.json()).toEqual({
    roster: "Liste de guilde à jour.",
    raidLogs: ["Journal du raid importé : 1 boss tué, 2 présents, 0 objets ajoutés."],
    characters: 1,
    changes: "1 changement fait en jeu : 1 accepté, 0 refusés.",
    texts: [],
  });
  // Sent again by another officer's companion: nothing new.
  const again = await request.post("/api/compagnon/envoi", { headers, data: upload });
  expect(await again.json()).toMatchObject({
    raidLogs: ["Journal du raid à jour."],
    changes: "1 changement fait en jeu : 1 accepté, 0 refusés.",
  });
  // The change went back to the game with the event's data, and the sign-up shows on the website.
  await page.goto(`/evenements/${readSeed().companionEventId}`);
  await expect(page.getByRole("group", { name: "Tank" })).toContainText("1Ciel Gris");
  expect((await request.post("/api/compagnon/envoi", { headers, data: { raidLogs: "x" } })).status()).toBe(400);
});

test("an officer creates an event in game: the website creates it and announces it", async ({
  page,
  context,
  request,
}) => {
  const token = await linkCompanion(page, context, request, "officer");
  const creation = {
    id: "Ciel Gris#1796900500#3",
    eventId: "",
    author: "Ciel Gris",
    at: Math.floor(Date.now() / 1000),
    kind: "event",
    date: "20/06/2031",
    time: "21:00",
    raidIds: ["salle-des-thanes"],
    softReserves: 1,
    reason: "Raid créé en jeu",
  };
  const response = await request.post("/api/compagnon/envoi", {
    headers: { Authorization: `Bearer ${token}` },
    data: { changes: [creation] },
  });
  expect(((await response.json()) as { changes: string }).changes).toBe(
    "1 changement fait en jeu : 1 accepté, 0 refusés.",
  );
  await page.goto("/journal");
  await expect(page.getByText("Raid créé en jeu")).toBeVisible();
});

test("an officer opens a bet in game: the website opens it and announces it", async ({ page, context, request }) => {
  const token = await linkCompanion(page, context, request, "officer");
  const opening = {
    id: "Ciel Gris#1796900600#4",
    eventId: "",
    author: "Ciel Gris",
    at: Math.floor(Date.now() / 1000),
    kind: "bet",
    title: "Qui tombe le premier ?",
    choices: ["Le tank", "Le soigneur"],
    date: "20/06/2031",
    time: "21:00",
    reason: "Pari ouvert en jeu",
  };
  const response = await request.post("/api/compagnon/envoi", {
    headers: { Authorization: `Bearer ${token}` },
    data: { changes: [opening] },
  });
  expect(((await response.json()) as { changes: string }).changes).toBe(
    "1 changement fait en jeu : 1 accepté, 0 refusés.",
  );
  await page.goto("/paris");
  await expect(page.getByText("Qui tombe le premier ?").first()).toBeVisible();
});

test("the recap of the raids over is published every day", async ({ request }) => {
  expect((await request.get("/api/cron/recaps")).status()).toBe(401);
  const authorization = { authorization: `Bearer ${WEB_ENVIRONMENT.CRON_SECRET}` };
  const response = await request.get("/api/cron/recaps", { headers: authorization });
  expect(await response.json()).toEqual({ published: 0 });
});

test("a visitor signs in first, then comes back to the link", async ({ page }) => {
  await page.goto(linkPage(pkce().challenge));
  await expect(page).toHaveURL(/\/connexion\?suite=/);
  const signIn = page.getByRole("link", { name: "Connexion Discord" });
  await expect(signIn).toHaveAttribute("href", /^\/connexion\/discord\?suite=%2Fcompagnon%2Frelier%3Fport%3D53682/);
});

test("a malformed link, or a code without the companion's secret, is refused", async ({ page, context, request }) => {
  await signInAs(context, "member");
  await page.goto(`/compagnon/relier?port=80&etat=${STATE}&defi=x`);
  await expect(page.getByText("Ce lien de liaison n'est pas valide")).toBeVisible();
  const refused = await request.post("/api/compagnon/jeton", { data: { code: "unknown", verifier: "unknown" } });
  expect(refused.status()).toBe(400);
  expect(await refused.json()).toEqual({ error: "La liaison a échoué ou a expiré : relance-la depuis le compagnon." });
  expect((await request.get("/api/compagnon/moi")).status()).toBe(401);
});
