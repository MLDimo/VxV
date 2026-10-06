"use client";

import type { BetChoice } from "@vxv/server";
import { useActionState, useId } from "react";
import { endBet } from "@/app/actions/bets";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";

/** Officers declare the winning choice, or cancel the bet (every stake given back), with a reason. */
export function BetEndForm({ betId, choices }: { betId: string; choices: BetChoice[] }) {
  const [state, action, pending] = useActionState(endBet, IDLE);
  const winnerFieldId = useId();
  return (
    <form action={action} className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
      <input type="hidden" name="betId" value={betId} />
      <div>
        <label htmlFor={winnerFieldId} className="text-sm text-lavender">
          Choix gagnant
        </label>
        <select id={winnerFieldId} name="choiceId" className="field">
          {choices.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
            </option>
          ))}
        </select>
      </div>
      <label className="block">
        <span className="text-sm text-lavender">Motif (visible dans le journal)</span>
        <input name="reason" required className="field" placeholder="Le tank est tombé en premier" />
      </label>
      <div className="flex gap-3 sm:col-span-2">
        <button type="submit" name="intent" value="result" disabled={pending} className="button-wood text-gold">
          Déclarer le résultat
        </button>
        <button type="submit" name="intent" value="cancel" disabled={pending} className="button-wood">
          Annuler le pari
        </button>
      </div>
      <div className="sm:col-span-2">
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
