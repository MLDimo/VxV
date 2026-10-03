"use client";

import type { BoardItem } from "@vxv/server";
import { useActionState, useId } from "react";
import { changeExclusion } from "@/app/actions/exclusions";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";

const FIELD = "mt-1 block w-full rounded border border-zinc-700 bg-zinc-900 p-2";

/** Officers exclude an item from the soft reserves of this event, or allow it again, with a reason. */
export function ExclusionForm({ eventId, items }: { eventId: string; items: BoardItem[] }) {
  const [state, action, pending] = useActionState(changeExclusion, IDLE);
  // Explicit label: a label wrapping a select would also announce the selected option.
  const itemFieldId = useId();
  return (
    <form action={action} className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <label htmlFor={itemFieldId} className="text-sm text-zinc-300">
          Objet
        </label>
        <select id={itemFieldId} name="itemId" className={FIELD}>
          {items.map((item) => (
            <option key={item.itemId} value={item.itemId}>
              {item.excluded ? `${item.name} (exclu)` : item.name}
            </option>
          ))}
        </select>
      </div>
      <label className="block">
        <span className="text-sm text-zinc-300">Motif de l&apos;exclusion (visible dans le journal)</span>
        <input name="reason" required className={FIELD} />
      </label>
      <div className="flex gap-3 sm:col-span-2">
        <button
          type="submit"
          name="intent"
          value="exclude"
          disabled={pending}
          className="rounded bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          Exclure
        </button>
        <button
          type="submit"
          name="intent"
          value="include"
          disabled={pending}
          className="rounded border border-zinc-600 px-4 py-2 font-semibold hover:bg-zinc-800 disabled:opacity-50"
        >
          Réintégrer
        </button>
      </div>
      <div className="sm:col-span-2">
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
