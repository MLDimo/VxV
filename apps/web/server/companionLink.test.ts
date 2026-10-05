import { describe, expect, it } from "vitest";
import { companionCallbackUrl, parseCompanionLinkRequest } from "./companionLink";

const STATE = "a".repeat(32);
const CHALLENGE = "b".repeat(43);

describe("companion link request", () => {
  it("reads the port, the state and the challenge of the link", () => {
    expect(parseCompanionLinkRequest({ port: "53682", etat: STATE, defi: CHALLENGE })).toEqual({
      port: 53682,
      state: STATE,
      challenge: CHALLENGE,
    });
  });

  it("refuses a reserved or invalid port, a malformed state or a missing challenge", () => {
    for (const params of [
      { port: "80", etat: STATE, defi: CHALLENGE },
      { port: "70000", etat: STATE, defi: CHALLENGE },
      { port: "abc", etat: STATE, defi: CHALLENGE },
      { port: "53682", etat: "short", defi: CHALLENGE },
      { port: "53682", etat: `${STATE}&x=1`, defi: CHALLENGE },
      { port: "53682", etat: STATE, defi: null },
    ]) {
      expect(parseCompanionLinkRequest(params)).toBeUndefined();
    }
  });

  it("hands the code to the companion on this computer only", () => {
    const request = { port: 53682, state: STATE, challenge: CHALLENGE };
    expect(companionCallbackUrl(request, "code+/=")).toBe(
      `http://127.0.0.1:53682/retour?code=code%2B%2F%3D&etat=${STATE}`,
    );
  });
});
