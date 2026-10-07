"use client";

import type { Bet, Stake } from "@vxv/server";
import { MIN_STAKE } from "@vxv/server/domain/bets";
import { useActionState } from "react";
import { stakeOnBet } from "@/app/actions/bets";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { Field } from "./Field";

/** The member's stake on a bet: a choice and an amount, then "Miser"; or the stake taken back. */
export function StakeForm({ bet, current }: { bet: Bet; current: Stake | undefined }) {
  const [state, action, pending] = useActionState(stakeOnBet, IDLE);
  const locked = current?.paidAt !== undefined;
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="betId" value={bet.id} />
      <fieldset disabled={locked}>
        <legend className="text-sm text-lavender">Mon choix</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {bet.choices.map((choice) => (
            <label key={choice.id} className="flex items-center gap-2 bg-ink/50 px-3 py-2">
              <input
                type="radio"
                name="choiceId"
                value={choice.id}
                required
                defaultChecked={choice.id === current?.choiceId}
              />
              {choice.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Mise (po)">
          <input
            type="number"
            name="amount"
            min={MIN_STAKE}
            step={1}
            required
            disabled={locked}
            defaultValue={current?.amount}
            className="field w-32"
          />
        </Field>
        <button type="submit" name="intent" value="stake" disabled={pending || locked} className="button-gold">
          {current === undefined ? "Miser" : "Modifier ma mise"}
        </button>
        {current !== undefined && (
          <button
            type="submit"
            name="intent"
            value="withdraw"
            formNoValidate
            disabled={pending || locked}
            className="button-wood"
          >
            Retirer ma mise
          </button>
        )}
      </div>
      {locked && <p className="text-sm text-muted">Ta mise est payée au trésorier : elle ne peut plus changer.</p>}
      <ActionMessages state={state} />
    </form>
  );
}
