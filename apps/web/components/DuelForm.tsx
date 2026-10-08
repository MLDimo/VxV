"use client";

import { useActionState } from "react";
import { challengeDuel } from "@/app/actions/duels";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { Field, Options } from "./Field";

/** The member challenges another of the guild to a 1v1: whom, when and where. */
export function DuelForm({
  opponents,
  maxPlaceLength,
}: {
  opponents: readonly { memberId: string; name: string }[];
  maxPlaceLength: number;
}) {
  const [state, action, pending] = useActionState(challengeDuel, IDLE);
  return (
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-3">
      <Field label="Joueur défié">
        <select name="opponentId" required defaultValue="" className="field">
          <option value="" disabled>
            Choisir un joueur
          </option>
          <Options options={opponents.map((opponent) => [opponent.memberId, opponent.name] as const)} />
        </select>
      </Field>
      <Field label="Date et heure (heure de Paris)">
        <input type="datetime-local" name="scheduledAt" required className="field" />
      </Field>
      <Field label="Lieu">
        <input name="place" required maxLength={maxPlaceLength} className="field" placeholder="Porte d'Orgrimmar" />
      </Field>
      <div className="sm:col-span-3">
        <button type="submit" disabled={pending} className="button-pixel">
          Lancer le défi
        </button>
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
