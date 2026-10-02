import type { Member } from "../domain/members.ts";
import { canManageRaids } from "../domain/permissions.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";

/** Every officer action checks the actor's role and requires a reason, kept in the journal. */
export function checkOfficerAction(actor: Member, reason: string): string {
  if (!canManageRaids(actor.role)) {
    throw new ForbiddenError();
  }
  const trimmed = reason.trim();
  if (trimmed.length === 0) {
    throw new ValidationError("Le motif est obligatoire : il apparaîtra dans le journal.");
  }
  return trimmed;
}
