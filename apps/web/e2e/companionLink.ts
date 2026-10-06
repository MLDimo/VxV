import { createHash, randomBytes } from "node:crypto";
import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import type { E2ESessions } from "./environment";
import { signInAs } from "./sessions";

export const PORT = 53682;
export const STATE = randomBytes(16).toString("base64url");

/** The companion's secret and the challenge it sends first. */
export function pkce() {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

export const linkPage = (challenge: string) => `/compagnon/relier?port=${PORT}&etat=${STATE}&defi=${challenge}`;

/** The member links a companion, as the app does it: returns its token. */
export async function linkCompanion(
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
