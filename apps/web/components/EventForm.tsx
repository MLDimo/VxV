"use client";

import type { RaidSummary } from "@vxv/server";
import { useActionState } from "react";
import { createEvent } from "@/app/actions/events";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";

const FIELD = "mt-1 block w-full rounded border border-zinc-700 bg-zinc-900 p-2";

export function EventForm({
  raids,
  defaultSoftReserves,
  maxSoftReserves,
}: {
  raids: RaidSummary[];
  defaultSoftReserves: number;
  maxSoftReserves: number;
}) {
  const [state, action, pending] = useActionState(createEvent, IDLE);
  return (
    <form action={action} className="mt-6 max-w-lg space-y-5">
      <label className="block">
        <span className="text-sm text-zinc-300">Date et heure (heure de Paris)</span>
        <input type="datetime-local" name="startsAt" required className={FIELD} />
      </label>
      <fieldset>
        <legend className="text-sm text-zinc-300">Raids de la soirée</legend>
        <div className="mt-2 space-y-2">
          {raids.map((raid) => (
            <label key={raid.id} className="flex items-center gap-2">
              <input type="checkbox" name="raidIds" value={raid.id} />
              {raid.name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="text-sm text-zinc-300">SR par joueur</span>
        <input
          type="number"
          name="softReservesPerPlayer"
          min={1}
          max={maxSoftReserves}
          defaultValue={defaultSoftReserves}
          required
          className={FIELD}
        />
      </label>
      <label className="block">
        <span className="text-sm text-zinc-300">Motif (visible dans le journal)</span>
        <input name="reason" required placeholder="Raid de la semaine" className={FIELD} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {pending ? "Création…" : "Créer l'événement"}
      </button>
      <ActionMessages state={state} />
    </form>
  );
}
