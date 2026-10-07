"use client";

import { useActionState } from "react";
import { startSeason } from "@/app/actions/ranking";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { ReasonField } from "./Field";

/** Officers start a new season: the rankings by season start again from now. */
export function SeasonForm() {
  const [state, action, pending] = useActionState(startSeason, IDLE);
  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
      <ReasonField placeholder="Nouvelle phase de raids" className="grow" />
      <button type="submit" disabled={pending} className="button-wood text-gold">
        Lancer une nouvelle saison
      </button>
      <div className="w-full">
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
