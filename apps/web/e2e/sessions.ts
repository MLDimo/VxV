import { readFileSync } from "node:fs";
import type { BrowserContext } from "@playwright/test";
import { SEED_FILE, type E2ESeed, type E2ESessions } from "./environment";

/** What the database server prepared (written before the website starts). */
export function readSeed(): E2ESeed {
  return JSON.parse(readFileSync(SEED_FILE, "utf8")) as E2ESeed;
}

/** Signs the browser in as one of the prepared members, as the session cookie would after Discord. */
export async function signInAs(context: BrowserContext, who: keyof E2ESessions): Promise<void> {
  await context.addCookies([
    {
      name: "vxv_session",
      value: readSeed().sessions[who],
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
