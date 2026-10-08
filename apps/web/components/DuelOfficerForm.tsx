"use client";

import { useActionState } from "react";
import { settleDuel } from "@/app/actions/duels";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { Field, Options, ReasonField } from "./Field";

/** Officers settle a duel the players do not: its winner, or its cancellation, with a reason for the journal. */
export function DuelOfficerForm({
  duelId,
  players,
  accepted,
}: {
  duelId: string;
  players: readonly { memberId: string; name: string }[];
  /** Only an accepted duel has a winner to record. */
  accepted: boolean;
}) {
  const [state, action, pending] = useActionState(settleDuel, IDLE);
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="duelId" value={duelId} />
      {accepted && (
        <Field label="Vainqueur">
          <select name="winnerId" className="field">
            <Options options={players.map((player) => [player.memberId, player.name] as const)} />
          </select>
        </Field>
      )}
      <ReasonField placeholder="Vu en jeu" />
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        {accepted && (
          <button type="submit" name="intent" value="result" disabled={pending} className="button-wood text-gold">
            Enregistrer le vainqueur
          </button>
        )}
        <button type="submit" name="intent" value="cancel" disabled={pending} className="button-wood text-gold">
          Annuler le duel
        </button>
      </div>
      <ActionMessages state={state} />
    </form>
  );
}
