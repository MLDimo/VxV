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

/** An officer publishes a mission: its type, title, reward, start and length, and the reason. */
export function MissionForm() {
  const [state, action, pending] = useActionState(createMission, IDLE);
  return (
    <form action={action} className="mt-6 max-w-lg space-y-5">
      <label className="block">
        <span className="text-sm text-lavender">Type (compteur du jeu)</span>
        <select name="type" required className="field">
          {MISSION_TYPES.map((type) => (
            <option key={type} value={type}>
              {MISSION_TYPE_LABELS[type].name} : {MISSION_TYPE_LABELS[type].counts}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-lavender">Titre</span>
        <input
          name="title"
          required
          maxLength={MAX_MISSION_TITLE_LENGTH}
          placeholder="Le Grand Pêcheur"
          className="field"
        />
      </label>
      <label className="block">
        <span className="text-sm text-lavender">Récompense (po), partagée 70 / 20 / 10 %</span>
        <input type="number" name="reward" min={1} step={1} required className="field" />
      </label>
      <label className="block">
        <span className="text-sm text-lavender">Début (heure de Paris)</span>
        <input type="datetime-local" name="startsAt" required className="field" />
      </label>
      <label className="block">
        <span className="text-sm text-lavender">Durée (jours)</span>
        <input
          type="number"
          name="days"
          min={1}
          max={MAX_MISSION_DAYS}
          defaultValue={DEFAULT_MISSION_DAYS}
          required
          className="field"
        />
      </label>
      <label className="block">
        <span className="text-sm text-lavender">Motif (visible dans le journal)</span>
        <input name="reason" required placeholder="Mission de la semaine" className="field" />
      </label>
      <button type="submit" disabled={pending} className="button-pixel">
        {pending ? "Publication…" : "Publier la mission"}
      </button>
      <ActionMessages state={state} />
    </form>
  );
}
