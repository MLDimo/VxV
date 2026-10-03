import type { SignedIn } from "@vxv/server";
import { describe, expect, it, vi } from "vitest";
import { completeDiscordSignIn, type DiscordGuildMember, type DiscordSignInDependencies } from "./discordSignIn";

const guildMember: DiscordGuildMember = { identity: { discordId: "1", discordName: "Déjà" }, roleIds: ["r"] };
const session: SignedIn = {
  token: "token",
  expiresAt: new Date("2026-10-10T00:00:00Z"),
  member: { id: "m", discordId: "1", discordName: "Déjà", roles: ["member"] },
};
const validRequest = { code: "code", state: "state", expectedState: "state", codeVerifier: "verifier" };

function dependencies(overrides: Partial<DiscordSignInDependencies> = {}): DiscordSignInDependencies {
  return {
    exchangeCode: vi.fn(async () => "access-token"),
    fetchGuildMember: vi.fn(async () => guildMember),
    signIn: vi.fn(async () => session),
    ...overrides,
  };
}

describe("completeDiscordSignIn", () => {
  it("signs in a guild member with the code and verifier of this sign-in", async () => {
    const deps = dependencies();
    expect(await completeDiscordSignIn(validRequest, deps)).toEqual({ kind: "signedIn", session });
    expect(deps.exchangeCode).toHaveBeenCalledWith("code", "verifier");
    expect(deps.fetchGuildMember).toHaveBeenCalledWith("access-token");
    expect(deps.signIn).toHaveBeenCalledWith(guildMember.identity, guildMember.roleIds);
  });

  it.each([
    ["a missing code", { code: null }],
    ["a missing state", { state: null }],
    ["a state that does not match", { state: "forged" }],
    ["an expired sign-in (no stored state)", { expectedState: undefined }],
    ["a missing verifier", { codeVerifier: undefined }],
  ])("rejects %s without calling Discord", async (_case, change) => {
    const deps = dependencies();
    expect(await completeDiscordSignIn({ ...validRequest, ...change }, deps)).toEqual({ kind: "invalidRequest" });
    expect(deps.exchangeCode).not.toHaveBeenCalled();
  });

  it("refuses a user who is not on the guild server", async () => {
    const deps = dependencies({ fetchGuildMember: vi.fn(async () => undefined) });
    expect(await completeDiscordSignIn(validRequest, deps)).toEqual({ kind: "notGuildMember" });
    expect(deps.signIn).not.toHaveBeenCalled();
  });

  it("lets unexpected failures surface", async () => {
    const deps = dependencies({
      exchangeCode: vi.fn(async () => {
        throw new Error("Discord is down");
      }),
    });
    await expect(completeDiscordSignIn(validRequest, deps)).rejects.toThrow("Discord is down");
  });
});
