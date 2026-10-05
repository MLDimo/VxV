"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { companionCallbackUrl, parseCompanionLinkRequest } from "@/server/companionLink";
import { toErrorState } from "@/server/formActions";
import { requireMember } from "@/server/session";

const INVALID_LINK = "Ce lien de liaison n'est pas valide : relance la liaison depuis le compagnon.";

/** The member accepts to link the companion: the browser takes the link code back to it. */
export async function linkCompanion(_previous: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  const request = parseCompanionLinkRequest({
    port: String(form.get("port") ?? ""),
    etat: String(form.get("etat") ?? ""),
    defi: String(form.get("defi") ?? ""),
  });
  if (request === undefined) {
    return { status: "error", messages: [INVALID_LINK] };
  }
  let code: string;
  try {
    code = await getApplication().companion.startLink(member, request.challenge);
  } catch (error) {
    return toErrorState(error);
  }
  redirect(companionCallbackUrl(request, code));
}
