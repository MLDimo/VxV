import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createDiscordClient, DISCORD_SCOPES } from "@/server/discord";
import { safeNextPath } from "@/server/nextPath";
import {
  OAUTH_COOKIE_SECONDS,
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from "@/server/oauthCookies";

/** First half of the OAuth flow: remembers state, PKCE verifier and the page asked for, then goes to Discord. */
export async function GET(request: NextRequest) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = createDiscordClient(request.nextUrl.origin).createAuthorizationURL(state, codeVerifier, DISCORD_SCOPES);
  const store = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: OAUTH_COOKIE_SECONDS,
  };
  store.set(OAUTH_STATE_COOKIE, state, options);
  store.set(OAUTH_VERIFIER_COOKIE, codeVerifier, options);
  store.set(OAUTH_NEXT_COOKIE, safeNextPath(request.nextUrl.searchParams.get("suite")), options);
  return NextResponse.redirect(url);
}
