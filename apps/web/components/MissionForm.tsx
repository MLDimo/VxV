"use client";

import {
  DEFAULT_MISSION_DAYS,
  MAX_MISSION_DAYS,
  MAX_MISSION_TITLE_LENGTH,
  MISSION_TYPE_LABELS,
  MISSION_TYPES,
} from "@vxv/server/domain/missions";
import { useActionState } from "react";
import { createMission } from "@/app/actions/missions";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { Field, Options, ReasonField } from "./Field";

/** An officer publishes a mission: its type, title, reward, start and length, and the reason. */
export function MissionForm() {
  const [state, action, pending] = useActionState(createMission, IDLE);
  return (
    <form action={action} className="mt-6 max-w-lg space-y-5">
      <Field label="Type (compteur du jeu)">
        <select name="type" required className="field">
          <Options
            options={MISSION_TYPES.map(
              (type) => [type, `${MISSION_TYPE_LABELS[type].name} : ${MISSION_TYPE_LABELS[type].counts}`] as const,
            )}
          />
        </select>
      </Field>
      <Field label="Titre">
        <input
          name="title"
          required
          maxLength={MAX_MISSION_TITLE_LENGTH}
          placeholder="Le Grand Pêcheur"
          className="field"
        />
      </Field>
      <Field label="Récompense (po), partagée 70 / 20 / 10 %">
        <input type="number" name="reward" min={1} step={1} required className="field" />
      </Field>
      <Field label="Début (heure de Paris)">
        <input type="datetime-local" name="startsAt" required className="field" />
      </Field>
      <Field label="Durée (jours)">
        <input
          type="number"
          name="days"
          min={1}
          max={MAX_MISSION_DAYS}
          defaultValue={DEFAULT_MISSION_DAYS}
          required
          className="field"
        />
      </Field>
      <ReasonField placeholder="Mission de la semaine" />
      <button type="submit" disabled={pending} className="button-pixel">
        {pending ? "Publication…" : "Publier la mission"}
      </button>
      <ActionMessages state={state} />
    </form>
  );
}
