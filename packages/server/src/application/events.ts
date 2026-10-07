import {
  eventAudience,
  eventRoleChoices,
  reservedRole,
  ROLE_NOT_OFFERED,
  type EventRoleChoice,
} from "../domain/eventRoles.ts";
import { EVENT_LISTED_AFTER_START_MS, newEventRefusal, type NewRaidEvent, type RaidEvent } from "../domain/events.ts";
import type { Member } from "../domain/members.ts";
import type { GuildGateway } from "./discordPorts.ts";
import { ValidationError } from "./errors.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { Clock, UnitOfWork } from "./ports.ts";

interface EventsDependencies {
  unitOfWork: UnitOfWork;
  clock: Clock;
  /** The guild's Discord server, whose roles an event may be reserved to. */
  guild: GuildGateway;
}

export function createEvents({ unitOfWork, clock, guild }: EventsDependencies) {
  /** The roles an officer may reserve an event to, as Discord lists them now. */
  const listRoleChoices = async (): Promise<EventRoleChoice[]> => eventRoleChoices(await guild.listRoles());

  return {
    listRaids() {
      return unitOfWork.run(({ raids }) => raids.listAll());
    },

    listRoleChoices,

    /**
     * An officer plans a raid night: when, which raids, how many soft reserves each player gets, and the Discord role
     * whose holders alone may sign up.
     */
    async createEvent(officer: Member, event: NewRaidEvent, reason: string): Promise<string> {
      const motive = checkOfficerAction(officer, reason);
      const chosen = (await listRoleChoices()).find((choice) => choice.id === event.roleId);
      if (chosen === undefined) {
        throw new ValidationError(ROLE_NOT_OFFERED);
      }
      const role = reservedRole(chosen);
      return unitOfWork.run(async ({ raids, events, journal }) => {
        const known = await raids.listAll();
        const refusal = newEventRefusal(event, clock(), new Set(known.map((raid) => raid.id)));
        if (refusal !== undefined) {
          throw new ValidationError(refusal);
        }
        const eventId = await events.create({ ...event, role }, officer.id);
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
            audience: eventAudience(role),
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
