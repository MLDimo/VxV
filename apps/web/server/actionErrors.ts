import "server-only";
import { ApplicationError, RosterFormatError } from "@vxv/server";
import type { ActionState } from "@/components/actionState";

/** Turns a refusal of the application into messages for the user; unexpected errors keep propagating. */
export function toErrorState(error: unknown): ActionState {
  if (error instanceof RosterFormatError) {
    return { status: "error", messages: [...error.problems] };
  }
  if (error instanceof ApplicationError) {
    return { status: "error", messages: [error.message] };
  }
  throw error;
}
