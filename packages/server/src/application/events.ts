import { EVENT_LISTED_AFTER_START_MS, newEventRefusal, type NewRaidEvent, type RaidEvent } from "../domain/events.ts";
import type { Member } from "../domain/members.ts";
import { ValidationError } from "./errors.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { Clock, UnitOfWork } from "./ports.ts";

export function createEvents({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  return {
    listRaids() {
      return unitOfWork.run(({ raids }) => raids.listAll());
    },

    /** An officer plans a raid night: when, which raids, and how many soft reserves each player gets. */
    async createEvent(officer: Member, event: NewRaidEvent, reason: string): Promise<string> {
      const motive = checkOfficerAction(officer, reason);
      return unitOfWork.run(async ({ raids, events, journal }) => {
        const known = await raids.listAll();
        const refusal = newEventRefusal(event, clock(), new Set(known.map((raid) => raid.id)));
        if (refusal !== undefined) {
          throw new ValidationError(refusal);
        }
        const eventId = await events.create(event, officer.id);
        await journal.record({
          actorId: officer.id,
          action: "event.create",
          entity: "event",
          entityId: eventId,
          before: null,
          after: {
            startsAt: event.startsAt.toISOString(),
            raids: known.filter((raid) => event.raidIds.includes(raid.id)).map((raid) => raid.name),
            softReservesPerPlayer: event.softReservesPerPlayer,
          },
          reason: motive,
        });
        return eventId;
      });
    },

    getEvent(eventId: string): Promise<RaidEvent | undefined> {
      return unitOfWork.run(({ events }) => events.findById(eventId));
    },

    /** Events still to come, or started a few hours ago. */
    listUpcoming(): Promise<RaidEvent[]> {
      const since = new Date(clock().getTime() - EVENT_LISTED_AFTER_START_MS);
      return unitOfWork.run(({ events }) => events.listStartingAfter(since));
    },
  };
}
