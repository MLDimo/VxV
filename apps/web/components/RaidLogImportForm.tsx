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
        <span className="text-sm text-zinc-300">Journal du raid copié depuis l&apos;addon</span>
        <textarea
          name="log"
          required
          rows={6}
          className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-900 p-3 font-mono text-xs"
          placeholder={"VXV-LOG-1\nR;…"}
        />
      </label>
      <label className="block">
        <span className="text-sm text-zinc-300">Motif de l&apos;import (visible dans le journal)</span>
        <input
          name="reason"
          required
          className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-900 p-2"
          placeholder="Raid du jeudi"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {pending ? "Import en cours…" : "Importer le journal"}
      </button>
      <ActionMessages state={state} />
    </form>
  );
}
