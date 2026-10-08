import {
  eventAudience,
  eventRoleChoices,
  reservedRole,
  ROLE_NOT_OFFERED,
  type EventRole,
  type EventRoleChoice,
} from "../domain/eventRoles.ts";
import {
  EVENT_LISTED_AFTER_START_MS,
  newEventRefusal,
  newPvpEventRefusal,
  type EventKind,
  type GuildEvent,
  type NewPvpEvent,
  type NewRaidEvent,
  type PlannedEvent,
} from "../domain/events.ts";
import type { EventCreationRecord } from "../domain/journal.ts";
import type { Member } from "../domain/members.ts";
import type { GuildGateway } from "./discordPorts.ts";
import { ValidationError } from "./errors.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { Clock, Repositories, UnitOfWork } from "./ports.ts";

interface EventsDependencies {
  unitOfWork: UnitOfWork;
  clock: Clock;
  /** The guild's Discord server, whose roles an event may be reserved to. */
  guild: GuildGateway;
}

export function createEvents({ unitOfWork, clock, guild }: EventsDependencies) {
  /** The roles an officer may reserve an event to, as Discord lists them now. */
  const listRoleChoices = async (): Promise<EventRoleChoice[]> => eventRoleChoices(await guild.listRoles());

  /** The role the officer chose among the ones offered now: none when the event is open to everybody. */
  async function chosenRole(roleId: string): Promise<EventRole | undefined> {
    const chosen = (await listRoleChoices()).find((choice) => choice.id === roleId);
    if (chosen === undefined) {
      throw new ValidationError(ROLE_NOT_OFFERED);
    }
    return reservedRole(chosen);
  }

  /** Keeps the event and its creation in the journal. */
  async function plan(
    { events, journal }: Repositories,
    officer: Member,
    event: PlannedEvent,
    raidNames: string[],
    motive: string,
  ): Promise<string> {
    const eventId = await events.create(event, officer.id);
    const after: EventCreationRecord = {
      startsAt: event.startsAt.toISOString(),
      title: event.title,
      raids: raidNames,
      softReservesPerPlayer: event.softReservesPerPlayer,
      audience: eventAudience(event.role),
    };
    await journal.record({
      actorId: officer.id,
      action: "event.create",
      entity: "event",
      entityId: eventId,
      before: null,
      after,
      reason: motive,
    });
    return eventId;
  }

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
      const role = await chosenRole(event.roleId);
      return unitOfWork.run(async (repositories) => {
        const known = await repositories.raids.listAll();
        const refusal = newEventRefusal(event, clock(), new Set(known.map((raid) => raid.id)));
        if (refusal !== undefined) {
          throw new ValidationError(refusal);
        }
        const raidNames = known.filter((raid) => event.raidIds.includes(raid.id)).map((raid) => raid.name);
        return plan(repositories, officer, { ...event, kind: "raid", title: undefined, role }, raidNames, motive);
      });
    },

    /** An officer plans a PvP outing: its title, when, and the Discord role whose holders alone may sign up. */
    async createPvpEvent(officer: Member, event: NewPvpEvent, reason: string): Promise<string> {
      const motive = checkOfficerAction(officer, reason);
      const refusal = newPvpEventRefusal(event, clock());
      if (refusal !== undefined) {
        throw new ValidationError(refusal);
      }
      const role = await chosenRole(event.roleId);
      const planned: PlannedEvent = {
        kind: "pvp",
        title: event.title.trim(),
        startsAt: event.startsAt,
        raidIds: [],
        softReservesPerPlayer: 0,
        role,
      };
      return unitOfWork.run((repositories) => plan(repositories, officer, planned, [], motive));
    },

    getEvent(eventId: string): Promise<GuildEvent | undefined> {
      return unitOfWork.run(({ events }) => events.findById(eventId));
    },

    /** Events of this kind still to come, or started a few hours ago. */
    listUpcoming(kind: EventKind): Promise<GuildEvent[]> {
      const since = new Date(clock().getTime() - EVENT_LISTED_AFTER_START_MS);
      return unitOfWork.run(({ events }) => events.listStartingAfter(since, kind));
    },
  };
}
