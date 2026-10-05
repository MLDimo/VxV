import { createHash, randomBytes } from "node:crypto";
import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { SEED_ROSTER, WEB_ENVIRONMENT, type E2ESessions } from "./environment";
import { readSeed, signInAs } from "./sessions";

const PORT = 53682;
const STATE = randomBytes(16).toString("base64url");

/** The companion's secret and the challenge it sends first. */
function pkce() {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

const linkPage = (challenge: string) => `/compagnon/relier?port=${PORT}&etat=${STATE}&defi=${challenge}`;

/** The member links a companion, as the app does it: returns its token. */
async function linkCompanion(
  page: Page,
  context: BrowserContext,
  request: APIRequestContext,
  who: keyof E2ESessions = "member",
): Promise<string> {
  await signInAs(context, who);
  const { verifier, challenge } = pkce();
  let code = "";
  await page.route(`http://127.0.0.1:${PORT}/**`, async (route) => {
    code = new URL(route.request().url()).searchParams.get("code") ?? "";
    await route.fulfill({ body: "" });
  });
  await page.goto(linkPage(challenge));
  await page.getByRole("button", { name: "Relier le compagnon" }).click();
  await expect.poll(() => code).not.toBe("");
  const exchange = await request.post("/api/compagnon/jeton", { data: { code, verifier } });
  return ((await exchange.json()) as { token: string }).token;
}

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
  const { raid } = (await response.json()) as { raid: { text: string; title: string; startsAt: string } };
  // The soonest event is the one starting 10 minutes after the seed.
  expect(raid.title).toBe("La salle des Thanes");
  expect(raid.text.split("\n").slice(0, 2)).toEqual([
    "VXV-RAID-1",
    expect.stringMatching(`^E;${readSeed().lockedEventId};`),
  ]);
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
        "VXV-LOG-1",
        `R;${readSeed().companionEventId};${String(night)};${String(night + 3600)}`,
        `K;3493;${String(night + 1800)}`,
        "P;Ciel Gris",
        "P;Aubé Clairval",
      ].join("\n"),
    ],
    characters: [{ name: "Ciel Gris", race: "Orc", sex: 2 }],
  };
  const headers = { Authorization: `Bearer ${token}` };
  const response = await request.post("/api/compagnon/envoi", { headers, data: upload });
  expect(await response.json()).toEqual({
    roster: "Liste de guilde à jour.",
    raidLogs: ["Journal du raid importé : 1 boss tué, 2 présents, 0 objets ajoutés."],
    characters: 1,
  });
  // Sent again by another officer's companion: nothing new.
  const again = await request.post("/api/compagnon/envoi", { headers, data: upload });
  expect(((await again.json()) as { raidLogs: string[] }).raidLogs).toEqual(["Journal du raid à jour."]);
  expect((await request.post("/api/compagnon/envoi", { headers, data: { raidLogs: "x" } })).status()).toBe(400);
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
