import { createHash, randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

const PORT = 53682;
const STATE = randomBytes(16).toString("base64url");

/** The companion's secret and the challenge it sends first. */
function pkce() {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

const linkPage = (challenge: string) => `/compagnon/relier?port=${PORT}&etat=${STATE}&defi=${challenge}`;

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
