import { formatAddonEvent } from "../domain/addonExport.ts";
import { EVENT_LISTED_AFTER_START_MS, type GuildEvent } from "../domain/events.ts";
import { CREATION_ANSWERS_MS } from "../domain/gameChanges.ts";
import { eventTitle } from "../domain/labels.ts";
import type { Member } from "../domain/members.ts";
import { canManageRaids } from "../domain/permissions.ts";
import { addonReaders } from "./addonReaders.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";
import type { Clock, Repositories, UnitOfWork } from "./ports.ts";
import { loadBoardItems } from "./softReserves.ts";

/** The next event as the companion hands it to the addon, with what its window shows. */
interface NextEventExport {
  /** VXV-RAID text, as an officer would paste it. */
  text: string;
  title: string;
  startsAt: Date;
}

export function createAddonExport({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  /** The event as text for the addon: sign-ups, soft reserves, the officers it trusts and the journal. */
  async function format(repositories: Repositories, event: GuildEvent): Promise<string> {
    // One query after the other: a transaction's client runs one at a time.
    const signups = await repositories.signups.listByEvent(event.id);
    const board = await loadBoardItems(repositories, event, undefined);
    const characters = await repositories.characters.listAll();
    const journal = await repositories.journal.listForEvent(event.id);
    const since = new Date(clock().getTime() - CREATION_ANSWERS_MS);
    const changes = await repositories.gameChanges.listForEvent(event.id, since);
    return formatAddonEvent({
      event,
      signups,
      board,
      officers: (await addonReaders(repositories)).officers,
      mainCharacterIds: new Set(characters.filter((character) => character.isMain).map((character) => character.id)),
      journal,
      changes,
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
        const [event] = await repositories.events.listStartingAfter(since, "raid");
        if (event === undefined) {
          return undefined;
        }
        const title = eventTitle(event);
        return { text: await format(repositories, event), title, startsAt: event.startsAt };
      });
    },
  };
}
