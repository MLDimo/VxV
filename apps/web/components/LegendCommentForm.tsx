"use client";

import { LEGEND_LIMITS } from "@vxv/server/domain/legend";
import { useActionState } from "react";
import { commentExploit } from "@/app/actions/legend";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";

/** A memory to leave under a painting. */
export function LegendCommentForm({ exploitId }: { exploitId: string }) {
  const [state, action, pending] = useActionState(commentExploit, IDLE);
  return (
    <form action={action} className="mt-1">
      <input type="hidden" name="exploitId" value={exploitId} />
      <div className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Ton souvenir</span>
          <input
            name="body"
            required
            maxLength={LEGEND_LIMITS.comment}
            placeholder="Ajouter un souvenir…"
            className="field mt-0"
          />
        </label>
        <button type="submit" disabled={pending} className="button-pixel">
          Envoyer
        </button>
      </div>
      <ActionMessages state={state} />
    </form>
  );
}
