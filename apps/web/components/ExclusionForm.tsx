"use client";

import type { BoardItem } from "@vxv/server";
import { useActionState, useId } from "react";
import { changeExclusion } from "@/app/actions/exclusions";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { Options, ReasonField } from "./Field";

/** Officers exclude an item from the soft reserves of this event, or allow it again, with a reason. */
export function ExclusionForm({ eventId, items }: { eventId: string; items: BoardItem[] }) {
  const [state, action, pending] = useActionState(changeExclusion, IDLE);
  // Explicit label: a label wrapping a select would also announce the selected option.
  const itemFieldId = useId();
  return (
    <form action={action} className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <label htmlFor={itemFieldId} className="text-sm text-lavender">
          Objet
        </label>
        <select id={itemFieldId} name="itemId" className="field">
          <Options
            options={items.map((item) => [item.itemId, item.excluded ? `${item.name} (exclu)` : item.name] as const)}
          />
        </select>
      </div>
      <ReasonField label="Motif de l'exclusion" />
      <div className="flex gap-3 sm:col-span-2">
        <button type="submit" name="intent" value="exclude" disabled={pending} className="button-wood text-gold">
          Exclure
        </button>
        <button type="submit" name="intent" value="include" disabled={pending} className="button-wood">
          Réintégrer
        </button>
      </div>
      <div className="sm:col-span-2">
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
