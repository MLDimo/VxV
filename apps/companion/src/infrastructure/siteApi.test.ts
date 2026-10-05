import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { SiteError, UnlinkedError } from "../application/errors.ts";
import { createSiteApi } from "./siteApi.ts";

type Handler = (request: IncomingMessage, response: ServerResponse) => void;

describe("website API", () => {
  let server: Server | undefined;

  /** A website answering with the handler; returns its address. */
  async function site(handler: Handler): Promise<string> {
    server = createServer(handler);
    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
    return `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
  }

  afterEach(() => {
    server?.closeAllConnections();
    server?.close();
  });

  it("builds the address of the link page", () => {
    const api = createSiteApi("https://vxv.example");
    expect(api.linkPage({ port: 53682, state: "state", challenge: "chal-lenge_" })).toBe(
      "https://vxv.example/compagnon/relier?port=53682&etat=state&defi=chal-lenge_",
    );
  });

  it("sends the token, and reads who it acts for", async () => {
    let authorization: string | undefined;
    const api = createSiteApi(
      await site((request, response) => {
        authorization = request.headers.authorization;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ name: "Martin", roles: ["member", "officer"] }));
      }),
    );
    expect(await api.me("secret")).toEqual({ name: "Martin", roles: ["member", "officer"] });
    expect(authorization).toBe("Bearer secret");
  });

  it("tells when the website no longer accepts the token", async () => {
    const api = createSiteApi(
      await site((_, response) => {
        response.statusCode = 401;
        response.end(JSON.stringify({ error: "Relie-le de nouveau." }));
      }),
    );
    await expect(api.me("old")).rejects.toEqual(new UnlinkedError("Relie-le de nouveau."));
  });

  it("passes the website's refusal on, in French", async () => {
    const api = createSiteApi(
      await site((_, response) => {
        response.statusCode = 400;
        response.end(JSON.stringify({ error: "La liaison a échoué ou a expiré." }));
      }),
    );
    await expect(api.exchange("code", "verifier")).rejects.toEqual(new SiteError("La liaison a échoué ou a expiré."));
  });

  it("says when the website cannot be reached", async () => {
    const api = createSiteApi("http://127.0.0.1:9");
    await expect(api.me("token")).rejects.toBeInstanceOf(SiteError);
  });
});
