import "server-only";
import { ApplicationError, TextFormatError } from "@vxv/server";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/actionState";

/** Turns a refusal of the application into messages for the user; unexpected errors keep propagating. */
export function toErrorState(error: unknown): ActionState {
  if (error instanceof TextFormatError) {
    return { status: "error", messages: [...error.problems] };
  }
  if (error instanceof ApplicationError) {
    return { status: "error", messages: [error.message] };
  }
  throw error;
}

/** Runs the work of a form action: on success, refreshes the given pages and shows the returned message. */
export async function runFormAction(
  work: () => Promise<string>,
  pagesToRefresh: readonly string[],
): Promise<ActionState> {
  try {
    const message = await work();
    for (const page of pagesToRefresh) {
      revalidatePath(page);
    }
    return { status: "success", messages: [message] };
  } catch (error) {
    return toErrorState(error);
  }
}
