"use client";

import { useActionState } from "react";
import { confirmDeathrollPayment } from "@/app/actions/deathrolls";
import { IDLE } from "./actionState";

/** The winner's button on an unpaid deathroll: the loser paid. */
export function DeathrollPayment({ deathrollId }: { deathrollId: string }) {
  const [state, action, pending] = useActionState(confirmDeathrollPayment, IDLE);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="deathrollId" value={deathrollId} />
      <button type="submit" disabled={pending} className="button-wood text-gold">
        Paiement reçu
      </button>
      {state.status === "error" && (
        <span role="status" className="text-sm text-loss">
          {state.messages.join(" ")}
        </span>
      )}
    </form>
  );
}
