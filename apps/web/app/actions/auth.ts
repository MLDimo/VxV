"use server";

import { redirect } from "next/navigation";
import { getApplication } from "@/server/application";
import { deleteSessionCookie, readSessionToken } from "@/server/session";

export async function signOut(): Promise<void> {
  const token = await readSessionToken();
  if (token !== undefined) {
    await getApplication().auth.signOut(token);
  }
  await deleteSessionCookie();
  redirect("/connexion");
}
