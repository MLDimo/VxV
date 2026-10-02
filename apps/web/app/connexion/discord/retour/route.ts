import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getApplication } from "@/server/application";
import { createDiscordClient, fetchGuildMember } from "@/server/discord";
import { completeDiscordSignIn } from "@/server/discordSignIn";
import { OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE } from "@/server/oauthCookies";
import { saveSessionCookie } from "@/server/session";

const SIGN_IN_ERRORS = { notGuildMember: "non-membre", invalidRequest: "requete" } as const;

/** Discord sends the user back here after they accepted (or refused) the sign-in. */
export async function GET(request: NextRequest) {
  const store = await cookies();
  const expectedState = store.get(OAUTH_STATE_COOKIE)?.value;
  const codeVerifier = store.get(OAUTH_VERIFIER_COOKIE)?.value;
  store.delete(OAUTH_STATE_COOKIE);
  store.delete(OAUTH_VERIFIER_COOKIE);

  const discord = createDiscordClient(request.nextUrl.origin);
  const outcome = await completeDiscordSignIn(
    {
      code: request.nextUrl.searchParams.get("code"),
      state: request.nextUrl.searchParams.get("state"),
      expectedState,
      codeVerifier,
    },
    {
      exchangeCode: async (code, verifier) => (await discord.validateAuthorizationCode(code, verifier)).accessToken(),
      fetchGuildMember,
      signIn: (identity, roleIds) => getApplication().auth.signIn(identity, roleIds),
    },
  );

  if (outcome.kind !== "signedIn") {
    return NextResponse.redirect(new URL(`/connexion?erreur=${SIGN_IN_ERRORS[outcome.kind]}`, request.nextUrl.origin));
  }
  await saveSessionCookie(outcome.session);
  return NextResponse.redirect(new URL("/", request.nextUrl.origin));
}
