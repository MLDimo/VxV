"use client";

import { useActionState } from "react";
import { IDLE, type ActionState } from "./actionState";

/**
 * A one-click confirmation (a stake received, a reward or a deathroll paid): the button sends the hidden fields, and
 * a refusal shows beside it.
 */
export function ConfirmButton({
  action,
  fields,
  intent,
  label,
}: {
  action: (previous: ActionState, form: FormData) => Promise<ActionState>;
  fields: Readonly<Record<string, string | number>>;
  /** Sent as the field "intent" when the action does several things. */
  intent?: string;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  return (
    <form action={formAction} className="flex items-center gap-2">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        name={intent === undefined ? undefined : "intent"}
        value={intent}
        disabled={pending}
        className="button-wood text-gold"
      >
        {label}
      </button>
      {state.status === "error" && (
        <span role="status" className="text-sm text-loss">
          {state.messages.join(" ")}
        </span>
      )}
    </form>
  );
}
