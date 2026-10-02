import type { ActionState } from "./actionState";

/** Feedback of a form action: green when it worked, red with every problem otherwise. */
export function ActionMessages({ state }: { state: ActionState }) {
  if (state.status === "idle") {
    return null;
  }
  const colors = state.status === "success" ? "bg-emerald-950 text-emerald-200" : "bg-red-950 text-red-200";
  return (
    <ul className={`mt-4 space-y-1 rounded px-4 py-3 text-sm ${colors}`} role="status">
      {state.messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}
