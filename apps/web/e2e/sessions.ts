import { readFileSync } from "node:fs";
import type { BrowserContext } from "@playwright/test";
import { SESSIONS_FILE, WEB_PORT, type E2ESessions } from "./environment";

/** Signs the browser in as one of the prepared members, as the session cookie would after Discord. */
export async function signInAs(context: BrowserContext, who: keyof E2ESessions): Promise<void> {
  const sessions = JSON.parse(readFileSync(SESSIONS_FILE, "utf8")) as E2ESessions;
  await context.addCookies([
    { name: "vxv_session", value: sessions[who], domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
}

export const BASE_URL = `http://localhost:${WEB_PORT}`;
