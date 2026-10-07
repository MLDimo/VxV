"use client";

import { useActionState } from "react";
import { importRoster } from "@/app/actions/roster";
import { IDLE } from "./actionState";
import { ActionMessages } from "./ActionMessages";
import { Field, ReasonField } from "./Field";

export function RosterImportForm() {
  const [state, action, pending] = useActionState(importRoster, IDLE);
  return (
    <form action={action} className="mt-6 space-y-4">
      <Field label="Liste copiée depuis l'addon">
        <textarea
          name="roster"
          required
          rows={12}
          className="field font-mono text-sm"
          placeholder={"VXV-ROSTER-1\nPrénom;Nom;CLASSE"}
        />
      </Field>
      <ReasonField placeholder="Mise à jour hebdomadaire" />
      <button type="submit" disabled={pending} className="button-pixel">
        {pending ? "Import en cours…" : "Importer"}
      </button>
      <ActionMessages state={state} />
    </form>
  );
}
