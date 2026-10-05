import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { listenForReturn } from "../infrastructure/loopback.ts";
import { createSiteApi } from "../infrastructure/siteApi.ts";
import { SiteError } from "./errors.ts";
import { linkAccount } from "./link.ts";

const api = createSiteApi("https://vxv.example");
const member = { name: "Martin", roles: ["member"] };

/** The browser: opens the link page, and comes back to the companion with this code and state. */
function browser(answer: (page: URL) => { code: string; etat: string } | undefined) {
  return async (address: string) => {
    const page = new URL(address);
    const query = answer(page);
    if (query !== undefined) {
      await fetch(`http://127.0.0.1:${page.searchParams.get("port") ?? ""}/retour?${new URLSearchParams(query)}`);
    }
  };
}

describe("account link", () => {
  it("exchanges the code brought back by the browser with the secret whose challenge it sent", async () => {
    let challenge = "";
    const link = await linkAccount({
      api: {
        linkPage: api.linkPage,
        exchange: async (code, verifier) => {
          expect(code).toBe("the-code");
          expect(createHash("sha256").update(verifier).digest("base64url")).toBe(challenge);
          return { token: "token", member };
        },
      },
      listen: listenForReturn,
      openBrowser: browser((page) => {
        expect(page.pathname).toBe("/compagnon/relier");
        challenge = page.searchParams.get("defi") ?? "";
        return { code: "the-code", etat: page.searchParams.get("etat") ?? "" };
      }),
    });
    expect(link).toEqual({ token: "token", member });
  });

  it("refuses a return that does not carry its own state", async () => {
    const attempt = linkAccount({
      api: { linkPage: api.linkPage, exchange: async () => ({ token: "token", member }) },
      listen: listenForReturn,
      openBrowser: browser(() => ({ code: "code", etat: "someone else's" })),
    });
    await expect(attempt).rejects.toEqual(new SiteError("La liaison n'a pas abouti : relance-la."));
  });

  it("gives up when the member never confirms, or cancels", async () => {
    const dependencies = {
      api: { linkPage: api.linkPage, exchange: async () => ({ token: "token", member }) },
      listen: listenForReturn,
      openBrowser: browser(() => undefined),
    };
    await expect(linkAccount({ ...dependencies, timeoutMs: 10 })).rejects.toBeInstanceOf(SiteError);
    const controller = new AbortController();
    const cancelled = linkAccount(dependencies, controller.signal);
    setTimeout(() => controller.abort(), 10);
    await expect(cancelled).rejects.toEqual(new SiteError("Liaison annulée."));
  });
});
