import type { Member } from "../domain/members.ts";
import { canManageRaids, canManageTreasury } from "../domain/permissions.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";

function requiredReason(reason: string): string {
  const trimmed = reason.trim();
  if (trimmed.length === 0) {
    throw new ValidationError("Le motif est obligatoire : il apparaîtra dans le journal.");
  }
  return trimmed;
}

/** Every officer action checks the actor's roles and requires a reason, kept in the journal. */
export function checkOfficerAction(actor: Member, reason: string): string {
  if (!canManageRaids(actor.roles)) {
    throw new ForbiddenError();
  }
  return requiredReason(reason);
}

/** The treasurer's validations; a movement of the guild's cash also requires its reason. */
export function checkTreasurerAction(actor: Member): void {
  if (!canManageTreasury(actor.roles)) {
    throw new ForbiddenError("Cette action est réservée au trésorier.");
  }
}

export function checkTreasurerMovement(actor: Member, reason: string): string {
  checkTreasurerAction(actor);
  return requiredReason(reason);
}
