import type { ActionState } from "./actionState";

/** Feedback of a form action: green when it worked, red with every problem otherwise. */
export function ActionMessages({ state }: { state: ActionState }) {
  if (state.status === "idle") {
    return null;
  }
  const colors = state.status === "success" ? "bg-gain/14 text-gain" : "bg-loss/14 text-loss";
  return (
    <ul className={`mt-4 space-y-1 px-4 py-3 text-sm ${colors}`} role="status">
      {state.messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}
