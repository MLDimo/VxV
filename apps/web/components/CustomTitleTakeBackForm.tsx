"use client";

import { useActionState } from "react";
import { takeBackCustomTitle } from "@/app/actions/ranking";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { ReasonField } from "./Field";

/** Officers take back a title made by hand, with a reason. */
export function CustomTitleTakeBackForm({ titleId, name }: { titleId: string; name: string }) {
  const [state, action, pending] = useActionState(takeBackCustomTitle, IDLE);
  return (
    <form action={action} aria-label={`Retirer ${name}`} className="mt-3 grid gap-2">
      <input type="hidden" name="titleId" value={titleId} />
      <ReasonField label="Motif du retrait" />
      <div>
        <button type="submit" disabled={pending} className="button-wood text-gold">
          Retirer le titre
        </button>
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
