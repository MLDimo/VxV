import "server-only";
import { ApplicationError, TextFormatError } from "@vxv/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

/** Runs the work of a form action: on success, refreshes the given pages and opens the page whose path the work
 * returns (what it created, or the list after a deletion). */
export async function runRedirectAction(
  work: () => Promise<string>,
  pagesToRefresh: readonly string[],
): Promise<ActionState> {
  let target: string | undefined;
  const state = await runFormAction(async () => {
    target = await work();
    return "";
  }, pagesToRefresh);
  if (target !== undefined) {
    redirect(target);
  }
  return state;
}

/** A text field of the form, empty when absent. */
export function formText(form: FormData, name: string): string {
  return String(form.get(name) ?? "");
}
