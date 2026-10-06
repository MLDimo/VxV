"use client";

import { useActionState } from "react";
import { importRaidLog } from "@/app/actions/raidLogs";
import { IDLE } from "./actionState";
import { ActionMessages } from "./ActionMessages";

/** An officer pastes the raid's log exported by the addon (Butin tab): players present and items given. */
export function RaidLogImportForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(importRaidLog, IDLE);
  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      <label className="block">
        <span className="text-sm text-lavender">Journal du raid copié depuis l&apos;addon</span>
        <textarea name="log" required rows={6} className="field font-mono text-xs" placeholder={"VXV-LOG-2\nR;…"} />
      </label>
      <label className="block">
        <span className="text-sm text-lavender">Motif de l&apos;import (visible dans le journal)</span>
        <input name="reason" required className="field" placeholder="Raid du jeudi" />
      </label>
      <button type="submit" disabled={pending} className="button-pixel">
        {pending ? "Import en cours…" : "Importer le journal"}
      </button>
      <ActionMessages state={state} />
    </form>
  );
}
