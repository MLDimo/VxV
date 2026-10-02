"use client";

import { useActionState } from "react";
import { importRoster } from "@/app/actions/roster";
import { IDLE } from "./actionState";
import { ActionMessages } from "./ActionMessages";

export function RosterImportForm() {
  const [state, action, pending] = useActionState(importRoster, IDLE);
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm text-zinc-300">Liste copiée depuis l&apos;addon</span>
        <textarea
          name="roster"
          required
          rows={12}
          className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-900 p-3 font-mono text-sm"
          placeholder={"VXV-ROSTER-1\nPrénom;Nom;CLASSE"}
        />
      </label>
      <label className="block">
        <span className="text-sm text-zinc-300">Motif (visible dans le journal)</span>
        <input
          name="reason"
          required
          className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-900 p-2"
          placeholder="Mise à jour hebdomadaire"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {pending ? "Import en cours…" : "Importer"}
      </button>
      <ActionMessages state={state} />
    </form>
  );
}
