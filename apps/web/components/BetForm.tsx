"use client";

import { MAX_BET_TITLE_LENGTH, MAX_CHOICES, MIN_CHOICES } from "@vxv/server/domain/bets";
import { useActionState } from "react";
import { createBet } from "@/app/actions/bets";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { Field, ReasonField } from "./Field";

/** An officer opens a bet: the question, its choices one per line, when it closes, and the reason. */
export function BetForm() {
  const [state, action, pending] = useActionState(createBet, IDLE);
  return (
    <form action={action} className="mt-6 max-w-lg space-y-5">
      <Field label="Question">
        <input
          name="title"
          required
          maxLength={MAX_BET_TITLE_LENGTH}
          placeholder="Qui meurt en premier sur le boss 10 ?"
          className="field"
        />
      </Field>
      <Field label={`Choix, un par ligne (de ${String(MIN_CHOICES)} à ${String(MAX_CHOICES)})`}>
        <textarea name="choices" required rows={4} placeholder={"Un tank\nUn heal\nUn DPS"} className="field" />
      </Field>
      <Field label="Fermeture des mises (heure de Paris)">
        <input type="datetime-local" name="closesAt" required className="field" />
      </Field>
      <ReasonField placeholder="Pour le raid de jeudi" />
      <button type="submit" disabled={pending} className="button-pixel">
        {pending ? "Ouverture…" : "Ouvrir le pari"}
      </button>
      <ActionMessages state={state} />
    </form>
  );
}
