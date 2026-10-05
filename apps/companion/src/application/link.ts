import { createHash, randomBytes } from "node:crypto";
import { SiteError } from "./errors.ts";
import type { Account, LoopbackListener, SitePort } from "./ports.ts";

/** Time left to the member to confirm on the website. */
export const LINK_TIMEOUT_MS = 10 * 60 * 1000;

const SECRET_BYTES = 32;
const STATE_BYTES = 16;
const TIMED_OUT = "La liaison a expiré : relance-la et confirme-la sur le site.";
const CANCELLED = "Liaison annulée.";
const FAILED = "La liaison n'a pas abouti : relance-la.";

export interface LinkDependencies {
  api: Pick<SitePort, "linkPage" | "exchange">;
  listen(): Promise<LoopbackListener>;
  openBrowser(url: string): Promise<void>;
  timeoutMs?: number;
}

/** Rejects when the time is up or the signal aborts. */
function waitFor<Value>(promise: Promise<Value>, timeoutMs: number, signal: AbortSignal | undefined): Promise<Value> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new SiteError(CANCELLED));
    if (signal?.aborted) {
      abort();
      return;
    }
    const timer = setTimeout(() => reject(new SiteError(TIMED_OUT)), timeoutMs);
    signal?.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    });
  });
}

/**
 * Links the companion to the member signed in on the website (OAuth for native apps: loopback and PKCE). The
 * browser opens the website's link page; once the member confirms, it brings a code back to this computer, which
 * the companion exchanges, with the secret it kept, for its token.
 */
export async function linkAccount(
  { api, listen, openBrowser, timeoutMs = LINK_TIMEOUT_MS }: LinkDependencies,
  signal?: AbortSignal,
): Promise<{ token: string; member: Account }> {
  const verifier = randomBytes(SECRET_BYTES).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(STATE_BYTES).toString("base64url");
  const listener = await listen();
  try {
    await openBrowser(api.linkPage({ port: listener.port, state, challenge }));
    const query = await waitFor(listener.returned, timeoutMs, signal);
    const code = query.get("code");
    if (query.get("etat") !== state || !code) {
      throw new SiteError(FAILED);
    }
    return await api.exchange(code, verifier);
  } finally {
    listener.close();
  }
}
