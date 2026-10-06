"use client";

import { MAX_BET_TITLE_LENGTH, MAX_CHOICES, MIN_CHOICES } from "@vxv/server/domain/bets";
import { useActionState } from "react";
import { createBet } from "@/app/actions/bets";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";

/** An officer opens a bet: the question, its choices one per line, when it closes, and the reason. */
export function BetForm() {
  const [state, action, pending] = useActionState(createBet, IDLE);
  return (
    <form action={action} className="mt-6 max-w-lg space-y-5">
      <label className="block">
        <span className="text-sm text-lavender">Question</span>
        <input
          name="title"
          required
          maxLength={MAX_BET_TITLE_LENGTH}
          placeholder="Qui meurt en premier sur le boss 10 ?"
          className="field"
        />
      </label>
      <label className="block">
        <span className="text-sm text-lavender">
          Choix, un par ligne (de {MIN_CHOICES} à {MAX_CHOICES})
        </span>
        <textarea name="choices" required rows={4} placeholder={"Un tank\nUn heal\nUn DPS"} className="field" />
      </label>
      <label className="block">
        <span className="text-sm text-lavender">Fermeture des mises (heure de Paris)</span>
        <input type="datetime-local" name="closesAt" required className="field" />
      </label>
      <label className="block">
        <span className="text-sm text-lavender">Motif (visible dans le journal)</span>
        <input name="reason" required placeholder="Pour le raid de jeudi" className="field" />
      </label>
      <button type="submit" disabled={pending} className="button-pixel">
        {pending ? "Ouverture…" : "Ouvrir le pari"}
      </button>
      <ActionMessages state={state} />
    </form>
  );
}
