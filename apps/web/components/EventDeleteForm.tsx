"use client";

import { useActionState } from "react";
import { deleteEvent } from "@/app/actions/events";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { ReasonField } from "./Field";

/** Officers delete an event that has no history yet, with a reason: its sign-ups and its Discord message go with it. */
export function EventDeleteForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(deleteEvent, IDLE);
  return (
    <form action={action} aria-label="Supprimer l'événement" className="mt-3 grid gap-2">
      <input type="hidden" name="eventId" value={eventId} />
      <ReasonField label="Motif de la suppression" />
      <div>
        <button type="submit" disabled={pending} className="button-wood text-loss">
          Supprimer l&apos;événement
        </button>
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
