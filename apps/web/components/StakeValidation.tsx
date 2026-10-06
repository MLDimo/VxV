"use client";

import { useActionState } from "react";
import { validateStake } from "@/app/actions/treasury";
import { IDLE } from "./actionState";

/** The treasurer's button on a line of their book: the stake received, or its gain handed over. */
export function StakeValidation({ stakeId, intent }: { stakeId: string; intent: "paid" | "collected" }) {
  const [state, action, pending] = useActionState(validateStake, IDLE);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="stakeId" value={stakeId} />
      <button type="submit" name="intent" value={intent} disabled={pending} className="button-wood text-gold">
        {intent === "paid" ? "Reçue" : "Versé"}
      </button>
      {state.status === "error" && (
        <span role="status" className="text-sm text-loss">
          {state.messages.join(" ")}
        </span>
      )}
    </form>
  );
}
