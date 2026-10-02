"use server";

import { revalidatePath } from "next/cache";
import { describeRosterImport } from "@/components/journalEntries";
import type { ActionState } from "@/components/actionState";
import { toErrorState } from "@/server/actionErrors";
import { getApplication } from "@/server/application";
import { requireOfficer } from "@/server/session";

export async function importRoster(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  try {
    const summary = await getApplication().roster.importRoster(
      officer,
      String(form.get("roster") ?? ""),
      String(form.get("reason") ?? ""),
    );
    revalidatePath("/journal");
    return { status: "success", messages: [`Liste importée : ${describeRosterImport(summary)}.`] };
  } catch (error) {
    return toErrorState(error);
  }
}
