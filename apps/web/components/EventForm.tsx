"use client";

import type { EventRoleChoice, RaidSummary } from "@vxv/server";
import { useActionState } from "react";
import { createEvent } from "@/app/actions/events";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { EventRoleField } from "./EventRoleField";
import { Field, ReasonField } from "./Field";

export function EventForm({
  raids,
  roles,
  defaultSoftReserves,
  maxSoftReserves,
}: {
  raids: RaidSummary[];
  /** The Discord roles the event may be reserved to, everybody first. */
  roles: EventRoleChoice[];
  defaultSoftReserves: number;
  maxSoftReserves: number;
}) {
  const [state, action, pending] = useActionState(createEvent, IDLE);
  return (
    <form action={action} className="mt-6 max-w-lg space-y-5">
      <Field label="Date et heure (heure de Paris)">
        <input type="datetime-local" name="startsAt" required className="field" />
      </Field>
      <fieldset>
        <legend className="text-sm text-lavender">Raids de la soirée</legend>
        <div className="mt-2 space-y-2">
          {raids.map((raid) => (
            <label key={raid.id} className="flex items-center gap-2">
              <input type="checkbox" name="raidIds" value={raid.id} />
              {raid.name}
            </label>
          ))}
        </div>
      </fieldset>
      <EventRoleField roles={roles} />
      <Field label="SR par joueur">
        <input
          type="number"
          name="softReservesPerPlayer"
          min={1}
          max={maxSoftReserves}
          defaultValue={defaultSoftReserves}
          required
          className="field"
        />
      </Field>
      <ReasonField placeholder="Raid de la semaine" />
      <button type="submit" disabled={pending} className="button-pixel">
        {pending ? "Création…" : "Créer l'événement"}
      </button>
      <ActionMessages state={state} />
    </form>
  );
}
