"use client";

import { useActionState } from "react";
import { linkCompanion } from "@/app/actions/companion";
import { IDLE } from "./actionState";
import { ActionMessages } from "./ActionMessages";

/** The link request travels in hidden fields: the member only confirms. */
export function CompanionLinkForm({ port, state, challenge }: { port: number; state: string; challenge: string }) {
  const [result, action, pending] = useActionState(linkCompanion, IDLE);
  return (
    <form action={action} className="mt-8 flex flex-col items-center">
      <input type="hidden" name="port" value={port} />
      <input type="hidden" name="etat" value={state} />
      <input type="hidden" name="defi" value={challenge} />
      <button type="submit" disabled={pending} className="button-pixel">
        {pending ? "Liaison en cours…" : "Relier le compagnon"}
      </button>
      <ActionMessages state={result} />
    </form>
  );
}
