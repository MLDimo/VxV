import { formatAddonEvent } from "../domain/addonExport.ts";
import { EVENT_LISTED_AFTER_START_MS, type RaidEvent } from "../domain/events.ts";
import { raidTitle } from "../domain/labels.ts";
import type { Member } from "../domain/members.ts";
import { canManageRaids } from "../domain/permissions.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";
import type { Clock, Repositories, UnitOfWork } from "./ports.ts";
import { loadBoardItems } from "./softReserves.ts";

/** The next event as the companion hands it to the addon, with what its window shows. */
export interface NextEventExport {
  /** VXV-RAID text, as an officer would paste it. */
  text: string;
  title: string;
  startsAt: Date;
}

export function createAddonExport({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  /** The event as text for the addon: sign-ups, soft reserves, the officers it trusts and the journal. */
  async function format(repositories: Repositories, event: RaidEvent): Promise<string> {
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
      mainCharacterIds: new Set(characters.filter((character) => character.isMain).map((character) => character.id)),
      journal,
      exportedAt: clock(),
    });
  }

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
        return format(repositories, event);
      });
    },

    /**
     * The next event, or the one being played, for the companion of any member (P7.3): it shows in the member's
     * addon, and an officer's addon passes it on to the guild. Undefined when no event is planned.
     */
    exportNextEvent(): Promise<NextEventExport | undefined> {
      const since = new Date(clock().getTime() - EVENT_LISTED_AFTER_START_MS);
      return unitOfWork.run(async (repositories) => {
        const [event] = await repositories.events.listStartingAfter(since);
        if (event === undefined) {
          return undefined;
        }
        const title = raidTitle(event.raids.map((raid) => raid.name));
        return { text: await format(repositories, event), title, startsAt: event.startsAt };
      });
    },
  };
}
