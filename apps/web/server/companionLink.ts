/** The companion listens on this computer only, on a port of its choice above the reserved ones. */
const MIN_PORT = 1024;
const MAX_PORT = 65535;
/** The companion's random state, sent back with the code so that it recognizes its own link. */
const STATE = /^[A-Za-z0-9_-]{16,128}$/;
const MAX_CHALLENGE_LENGTH = 128;

/** A companion asks to be linked: where it listens, its state, and its PKCE challenge (checked by the server). */
interface CompanionLinkRequest {
  port: number;
  state: string;
  challenge: string;
}

/** The request written in the link's address (port, etat, defi), or undefined when it is not one. */
export function parseCompanionLinkRequest(params: {
  port?: string | null;
  etat?: string | null;
  defi?: string | null;
}): CompanionLinkRequest | undefined {
  const port = Number(params.port);
  const state = params.etat ?? "";
  const challenge = params.defi ?? "";
  if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT || !STATE.test(state)) {
    return undefined;
  }
  if (challenge === "" || challenge.length > MAX_CHALLENGE_LENGTH) {
    return undefined;
  }
  return { port, state, challenge };
}

/** Where the browser hands the code over to the companion: always this computer, never another address. */
export function companionCallbackUrl(request: CompanionLinkRequest, code: string): string {
  const url = new URL(`http://127.0.0.1:${request.port}/retour`);
  url.searchParams.set("code", code);
  url.searchParams.set("etat", request.state);
  return url.toString();
}
