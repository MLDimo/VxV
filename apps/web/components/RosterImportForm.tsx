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
        <span className="text-sm text-lavender">Liste copiée depuis l&apos;addon</span>
        <textarea
          name="roster"
          required
          rows={12}
          className="field font-mono text-sm"
          placeholder={"VXV-ROSTER-1\nPrénom;Nom;CLASSE"}
        />
      </label>
      <label className="block">
        <span className="text-sm text-lavender">Motif (visible dans le journal)</span>
        <input name="reason" required className="field" placeholder="Mise à jour hebdomadaire" />
      </label>
      <button type="submit" disabled={pending} className="button-pixel">
        {pending ? "Import en cours…" : "Importer"}
      </button>
      <ActionMessages state={state} />
    </form>
  );
}
