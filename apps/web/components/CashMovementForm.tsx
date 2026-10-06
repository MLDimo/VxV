"use client";

import { CASH_KIND_LABELS, MANUAL_CASH_KINDS, MAX_CASH_LABEL_LENGTH } from "@vxv/server/domain/cash";
import { useActionState } from "react";
import { recordCashMovement } from "@/app/actions/treasury";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";

export interface Giver {
  memberId: string;
  name: string;
}

/** The treasurer records a donation (with its giver), an expense or a reward, with its reason. */
export function CashMovementForm({ givers }: { givers: Giver[] }) {
  const [state, action, pending] = useActionState(recordCashMovement, IDLE);
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="text-sm">Mouvement</span>
        <select name="kind" required className="field">
          {MANUAL_CASH_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {CASH_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm">Montant (po)</span>
        <input type="number" name="amount" min={1} step={1} required className="field" />
      </label>
      <label className="block">
        <span className="text-sm">Libellé</span>
        <input
          name="label"
          required
          maxLength={MAX_CASH_LABEL_LENGTH}
          className="field"
          placeholder="Flacons pour le raid"
        />
      </label>
      <label className="block">
        <span className="text-sm">Donateur (pour un don)</span>
        <select name="memberId" className="field">
          <option value="">—</option>
          {givers.map((giver) => (
            <option key={giver.memberId} value={giver.memberId}>
              {giver.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm">Motif</span>
        <input name="reason" required className="field" placeholder="Achat validé par le staff" />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="button-pixel">
          Inscrire dans la caisse
        </button>
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
