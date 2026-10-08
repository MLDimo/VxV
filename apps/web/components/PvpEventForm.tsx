"use client";

import type { EventRoleChoice } from "@vxv/server";
import { useActionState } from "react";
import { createPvpEvent } from "@/app/actions/events";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { EventRoleField } from "./EventRoleField";
import { Field, ReasonField } from "./Field";

/** An officer plans a PvP outing: as a raid night, with a title instead of raids, and no soft reserve. */
export function PvpEventForm({ roles, maxTitleLength }: { roles: EventRoleChoice[]; maxTitleLength: number }) {
  const [state, action, pending] = useActionState(createPvpEvent, IDLE);
  return (
    <form action={action} className="mt-6 max-w-lg space-y-5">
      <Field label="Titre de l'événement">
        <input name="title" required maxLength={maxTitleLength} className="field" placeholder="Raid sur Astranaar" />
      </Field>
      <Field label="Date et heure (heure de Paris)">
        <input type="datetime-local" name="startsAt" required className="field" />
      </Field>
      <EventRoleField roles={roles} />
      <ReasonField placeholder="Événement du jeudi" />
      <button type="submit" disabled={pending} className="button-pixel">
        {pending ? "Création…" : "Créer l'événement"}
      </button>
      <ActionMessages state={state} />
    </form>
  );
}
