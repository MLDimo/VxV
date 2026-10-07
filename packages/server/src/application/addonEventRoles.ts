import { formatAddonEventRoles } from "../domain/addonEventRoles.ts";
import type { EventRoleChoice } from "../domain/eventRoles.ts";
import type { Member } from "../domain/members.ts";
import { canManageRaids } from "../domain/permissions.ts";
import { addonReaders } from "./addonReaders.ts";
import type { Clock, UnitOfWork } from "./ports.ts";

/** The roles an event may be reserved to, as the companion hands them to the addon of an officer. */
export function createAddonEventRoles({
  unitOfWork,
  clock,
  events,
}: {
  unitOfWork: UnitOfWork;
  clock: Clock;
  events: { listRoleChoices(): Promise<EventRoleChoice[]> };
}) {
  return {
    /**
     * VXV-ROLES text for the companion of an officer, who creates events in game; an officer's addon passes it on to
     * the guild. Undefined for the other members, and when Discord does not answer: the addon keeps what it has.
     */
    async exportEventRoles(member: Member): Promise<string | undefined> {
      if (!canManageRaids(member.roles)) {
        return undefined;
      }
      let roles: EventRoleChoice[];
      try {
        roles = await events.listRoleChoices();
      } catch (error) {
        console.error("Discord roles listing for the addon failed", error);
        return undefined;
      }
      return unitOfWork.run(async (repositories) =>
        formatAddonEventRoles(roles, { ...(await addonReaders(repositories)), exportedAt: clock() }),
      );
    },
  };
}
