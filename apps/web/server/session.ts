import "server-only";
import type { Member, SignedIn } from "@vxv/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getApplication } from "./application";

export const SESSION_COOKIE = "vxv_session";

export async function saveSessionCookie(session: SignedIn): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
}

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function deleteSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Signed-in member of the current request, looked up once per request. */
export const getCurrentMember = cache(async (): Promise<Member | undefined> => {
  const token = await readSessionToken();
  return token === undefined ? undefined : getApplication().auth.authenticate(token);
});

/** For pages reserved to guild members: unknown visitors go to the sign-in page. */
export async function requireMember(): Promise<Member> {
  const member = await getCurrentMember();
  if (member === undefined) {
    redirect("/connexion");
  }
  return member;
}
