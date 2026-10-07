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

/** Runs the work of a form action creating something: on success, refreshes the given pages and opens the page of
 * what was created, the path the work returns. */
export async function runCreateAction(
  work: () => Promise<string>,
  pagesToRefresh: readonly string[],
): Promise<ActionState> {
  let created: string | undefined;
  const state = await runFormAction(async () => {
    created = await work();
    return "";
  }, pagesToRefresh);
  if (created !== undefined) {
    redirect(created);
  }
  return state;
}

/** A text field of the form, empty when absent. */
export function formText(form: FormData, name: string): string {
  return String(form.get(name) ?? "");
}
