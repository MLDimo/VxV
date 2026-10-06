"use client";

import { useActionState } from "react";
import { payReward } from "@/app/actions/missions";
import { IDLE } from "./actionState";

/** The treasurer's button on a reward: handed over. */
export function RewardPayment({ missionId, rank }: { missionId: string; rank: number }) {
  const [state, action, pending] = useActionState(payReward, IDLE);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="missionId" value={missionId} />
      <input type="hidden" name="rank" value={rank} />
      <button type="submit" disabled={pending} className="button-wood text-gold">
        Versée
      </button>
      {state.status === "error" && (
        <span role="status" className="text-sm text-loss">
          {state.messages.join(" ")}
        </span>
      )}
    </form>
  );
}
