import type { DiscordIdentity, SignedIn } from "@vxv/server";

/** What Discord tells about the user inside the guild server, or undefined when they are not on it. */
export interface DiscordGuildMember {
  identity: DiscordIdentity;
  roleIds: string[];
}

export interface DiscordSignInRequest {
  code: string | null;
  state: string | null;
  /** State and PKCE verifier kept in short-lived cookies when the sign-in started. */
  expectedState: string | undefined;
  codeVerifier: string | undefined;
}

export interface DiscordSignInDependencies {
  exchangeCode(code: string, codeVerifier: string): Promise<string>;
  fetchGuildMember(accessToken: string): Promise<DiscordGuildMember | undefined>;
  signIn(identity: DiscordIdentity, roleIds: readonly string[]): Promise<SignedIn>;
}

export type DiscordSignInOutcome =
  { kind: "signedIn"; session: SignedIn } | { kind: "notGuildMember" } | { kind: "invalidRequest" };

/** Second half of the OAuth flow: checks the callback, then signs the guild member in. */
export async function completeDiscordSignIn(
  request: DiscordSignInRequest,
  dependencies: DiscordSignInDependencies,
): Promise<DiscordSignInOutcome> {
  const { code, state, expectedState, codeVerifier } = request;
  if (!code || !state || !codeVerifier || state !== expectedState) {
    return { kind: "invalidRequest" };
  }
  const accessToken = await dependencies.exchangeCode(code, codeVerifier);
  const member = await dependencies.fetchGuildMember(accessToken);
  if (member === undefined) {
    return { kind: "notGuildMember" };
  }
  return { kind: "signedIn", session: await dependencies.signIn(member.identity, member.roleIds) };
}
