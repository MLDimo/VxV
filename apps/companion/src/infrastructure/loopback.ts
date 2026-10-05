import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { LoopbackListener } from "../application/ports.ts";

/** The page the browser shows once it handed the code over: back to the companion. */
const RETURN_PAGE = `<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<title>VXV · Compagnon relié</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0814;color:#f4effc;
font:16px system-ui,sans-serif;text-align:center">
<p>C'est fait : tu peux fermer cette page et revenir au compagnon VXV.</p>
</body>
</html>`;

const RETURN_PATH = "/retour";
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;

/** Starts listening on a free port of 127.0.0.1, for the browser coming back from the website's link page. */
export async function listenForReturn(): Promise<LoopbackListener> {
  let resolveReturn: (query: URLSearchParams) => void = () => undefined;
  const returned = new Promise<URLSearchParams>((resolve) => {
    resolveReturn = resolve;
  });
  const server: Server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method !== "GET" || url.pathname !== RETURN_PATH) {
      response.writeHead(HTTP_NOT_FOUND).end();
      return;
    }
    response.writeHead(HTTP_OK, { "Content-Type": "text/html; charset=utf-8" }).end(RETURN_PAGE);
    resolveReturn(url.searchParams);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    port: (server.address() as AddressInfo).port,
    returned,
    close: () => {
      server.closeAllConnections();
      server.close();
    },
  };
}
