"use client";

import { useActionState } from "react";
import { closeMission } from "@/app/actions/missions";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { ReasonField } from "./Field";

/** Officers validate the result of an ended mission, with a reason: the first three's rewards follow. */
export function MissionCloseForm({ missionId }: { missionId: string }) {
  const [state, action, pending] = useActionState(closeMission, IDLE);
  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
      <input type="hidden" name="missionId" value={missionId} />
      <ReasonField placeholder="Classement vérifié" className="grow" />
      <button type="submit" disabled={pending} className="button-wood text-gold">
        Valider le résultat
      </button>
      <div className="w-full">
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
