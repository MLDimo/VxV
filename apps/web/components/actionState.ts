/** Result of a form action, shown under the form. Shared by server actions and client forms. */
export interface ActionState {
  status: "idle" | "success" | "error";
  messages: string[];
}

export const IDLE: ActionState = { status: "idle", messages: [] };
