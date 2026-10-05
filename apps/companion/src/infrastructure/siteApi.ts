import { SiteError, UnlinkedError } from "../application/errors.ts";
import type { Account, LinkRequest, NextRaid, SitePort, Upload, UploadReport } from "../application/ports.ts";

const HTTP_UNAUTHORIZED = 401;
const UNREACHABLE = "Le site VXV ne répond pas : vérifie ta connexion à Internet.";

/** The website's API for the companion (apps/web/app/api/compagnon). */
export function createSiteApi(siteUrl: string): SitePort {
  async function call<Result>(path: string, init: RequestInit = {}, token?: string): Promise<Result> {
    const headers = new Headers(init.headers);
    if (token !== undefined) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    let response: Response;
    try {
      response = await fetch(new URL(path, siteUrl), { ...init, headers });
    } catch {
      throw new SiteError(UNREACHABLE);
    }
    const body = (await response.json().catch(() => undefined)) as { error?: string } | undefined;
    if (response.status === HTTP_UNAUTHORIZED && token !== undefined) {
      throw new UnlinkedError(body?.error);
    }
    if (!response.ok) {
      throw new SiteError(body?.error ?? `Le site VXV a refusé la demande (${String(response.status)}).`);
    }
    return body as Result;
  }

  const json = (body: unknown): RequestInit => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return {
    linkPage({ port, state, challenge }: LinkRequest): string {
      const url = new URL("/compagnon/relier", siteUrl);
      url.search = new URLSearchParams({ port: String(port), etat: state, defi: challenge }).toString();
      return url.toString();
    },

    exchange(code: string, verifier: string): Promise<{ token: string; member: Account }> {
      return call("/api/compagnon/jeton", json({ code, verifier }));
    },

    me(token: string): Promise<Account> {
      return call("/api/compagnon/moi", {}, token);
    },

    download(token: string): Promise<{ raid: NextRaid | null }> {
      return call("/api/compagnon/donnees", {}, token);
    },

    upload(token: string, upload: Upload): Promise<UploadReport> {
      return call("/api/compagnon/envoi", json(upload), token);
    },

    // The companion forgets the token anyway: a token the website still knows expires unused.
    async unlink(token: string): Promise<void> {
      await call("/api/compagnon/jeton", { method: "DELETE" }, token).catch(() => undefined);
    },
  };
}
