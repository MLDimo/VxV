import { formatAddonEvent } from "../domain/addonExport.ts";
import type { Member } from "../domain/members.ts";
import { canManageRaids } from "../domain/permissions.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";
import type { Clock, UnitOfWork } from "./ports.ts";
import { loadBoardItems } from "./softReserves.ts";

export function createAddonExport({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  return {
    /**
     * The event as text for the addon: an officer pastes it in game, and the addon passes it on to the guild.
     * Officers only, since the addon trusts the data of the officers it names.
     */
    async exportEvent(officer: Member, eventId: string): Promise<string> {
      if (!canManageRaids(officer.roles)) {
        throw new ForbiddenError();
      }
      return unitOfWork.run(async (repositories) => {
        const event = await repositories.events.findById(eventId);
        if (event === undefined) {
          throw new ValidationError("Cet événement n'existe pas.");
        }
        const [signups, board, members, characters, journal] = await Promise.all([
          repositories.signups.listByEvent(event.id),
          loadBoardItems(repositories, event, undefined),
          repositories.members.listAll(),
          repositories.characters.listAll(),
          repositories.journal.listForEvent(event.id),
        ]);
        const managers = new Set(members.filter((member) => canManageRaids(member.roles)).map((member) => member.id));
        return formatAddonEvent({
          event,
          signups,
          board,
          officers: characters.filter(
            (character) => character.inGuild && character.memberId !== undefined && managers.has(character.memberId),
          ),
          mainCharacterIds: new Set(
            characters.filter((character) => character.isMain).map((character) => character.id),
          ),
          journal,
          exportedAt: clock(),
        });
      });
    },
  };
}
