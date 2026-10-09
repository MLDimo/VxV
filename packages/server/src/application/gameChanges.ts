import { fullName, type Character } from "../domain/characters.ts";
import { DUEL_DONE, type NewDuel } from "../domain/duels.ts";
import type { NewPvpEvent, NewRaidEvent } from "../domain/events.ts";
import {
  isBetChange,
  isCreation,
  isDuelChange,
  type GameChange,
  type GameChangeOutcome,
} from "../domain/gameChanges.ts";
import { formatDateTime, formatGold } from "../domain/labels.ts";
import { MISSION_TYPE_LABELS, missionEnd, type MissionType, type NewMission } from "../domain/missions.ts";
import type { BetChoice, NewBet } from "../domain/bets.ts";
import type { Member } from "../domain/members.ts";
import { canManageRaids } from "../domain/permissions.ts";
import { parseRaidStart } from "../domain/raidStart.ts";
import { ApplicationError, ValidationError } from "./errors.ts";
import type { Clock, UnitOfWork } from "./ports.ts";
import type { SignupInput } from "./signups.ts";

const UNKNOWN_AUTHOR = "Ce personnage n'est lié à aucun membre sur le site : lie-le avec /vxv_main ou /vxv_reroll.";
const UNREADABLE_START = "Date ou heure illisible : écris par exemple 15/10 et 21:00, comme sur Discord.";

/** The use cases a change goes through: each checks the author's rights as on the website. */
interface GameChangeDependencies {
  unitOfWork: UnitOfWork;
  clock: Clock;
  signups: { signUp(member: Member, eventId: string, input: SignupInput, madeAt?: Date): Promise<void> };
  softReserves: {
    setMine(member: Member, eventId: string, itemIds: readonly string[], madeAt?: Date): Promise<void>;
  };
  exclusions: {
    exclude(officer: Member, eventId: string, itemId: string, reason: string): Promise<void>;
    include(officer: Member, eventId: string, itemId: string, reason: string): Promise<void>;
  };
  events: {
    createEvent(officer: Member, event: NewRaidEvent, reason: string): Promise<string>;
    createPvpEvent(officer: Member, event: NewPvpEvent, reason: string): Promise<string>;
  };
  /** The event's message on Discord follows its sign-ups, and a new event gets one. */
  announcements: { announceQuietly(eventId: string): Promise<boolean> };
  bets: {
    create(officer: Member, input: NewBet, reason: string): Promise<string>;
    stake(member: Member, betId: string, choiceId: string, amount: number): Promise<{ bet: { choices: BetChoice[] } }>;
    withdraw(member: Member, betId: string): Promise<unknown>;
  };
  /** The bet's message on Discord follows its stakes. */
  betAnnouncements: { announceQuietly(betId: string): Promise<boolean> };
  missions: { create(officer: Member, input: NewMission, reason: string): Promise<string> };
  /** A quest published gets its message on Discord. */
  missionAnnouncements: { announceQuietly(missionId: string): Promise<boolean> };
  duels: {
    challenge(member: Member, input: NewDuel): Promise<string>;
    answer(member: Member, duelId: string, accept: boolean): Promise<void>;
    cancel(member: Member, duelId: string): Promise<void>;
    concede(member: Member, duelId: string): Promise<void>;
    recordFromGame(member: Member, duelId: string, winner: string, loser: string): Promise<void>;
  };
}

/** What a change did: the message the game shows its author, and what it created. */
interface Done {
  message: string;
  eventId?: string;
  betId?: string;
  duelId?: string;
  missionId?: string;
}

export function createGameChanges({
  unitOfWork,
  clock,
  signups,
  softReserves,
  exclusions,
  events,
  announcements,
  bets,
  betAnnouncements,
  missions,
  missionAnnouncements,
  duels,
}: GameChangeDependencies) {
  /** When something typed as on Discord happens ("15/12", "21:00"). */
  function startOf(date: string, time: string): Date {
    const startsAt = parseRaidStart(date, time, clock());
    if (startsAt === undefined) {
      throw new ValidationError(UNREADABLE_START);
    }
    return startsAt;
  }

  /**
   * Does the change as its author's member would on the website; returns what the game tells the author, and what it
   * created.
   */
  async function perform(author: { character: Character; member: Member }, change: GameChange): Promise<Done> {
    switch (change.kind) {
      case "signup":
        await signups.signUp(
          author.member,
          change.eventId,
          { characterId: author.character.id, role: change.role, spec: change.spec, status: change.status },
          change.madeAt,
        );
        await announcements.announceQuietly(change.eventId);
        return { message: "Inscription enregistrée sur le site." };
      case "reserves":
        await softReserves.setMine(author.member, change.eventId, change.itemIds.map(String), change.madeAt);
        return { message: "SR enregistrées sur le site." };
      case "exclusion":
        await (change.excluded ? exclusions.exclude : exclusions.include)(
          author.member,
          change.eventId,
          String(change.itemId),
          change.reason,
        );
        return { message: change.excluded ? "Objet exclu des SR." : "Objet de nouveau ouvert aux SR." };
      case "event": {
        const startsAt = startOf(change.date, change.time);
        const eventId = await events.createEvent(
          author.member,
          { startsAt, raidIds: change.raidIds, softReservesPerPlayer: change.softReserves, roleId: change.roleId },
          change.reason,
        );
        await announcements.announceQuietly(eventId);
        return { message: `Événement du ${formatDateTime(startsAt)} créé et annoncé sur Discord.` };
      }
      case "stake": {
        const { bet } = await bets.stake(author.member, change.betId, change.choiceId, change.amount);
        await betAnnouncements.announceQuietly(change.betId);
        const label = bet.choices.find((choice) => choice.id === change.choiceId)?.label ?? "";
        return { message: `Mise de ${formatGold(change.amount)} sur « ${label} » enregistrée : à payer au trésorier.` };
      }
      case "withdraw":
        await bets.withdraw(author.member, change.betId);
        await betAnnouncements.announceQuietly(change.betId);
        return { message: "Mise retirée." };
      case "bet": {
        const closesAt = startOf(change.date, change.time);
        const betId = await bets.create(
          author.member,
          { title: change.title, choices: change.choices, closesAt },
          change.reason,
        );
        await betAnnouncements.announceQuietly(betId);
        return { message: `Pari « ${change.title} » ouvert et annoncé sur Discord.`, betId };
      }
      case "pvpEvent": {
        const startsAt = startOf(change.date, change.time);
        const eventId = await events.createPvpEvent(
          author.member,
          { title: change.title, startsAt, roleId: change.roleId },
          change.reason,
        );
        await announcements.announceQuietly(eventId);
        return { message: `Événement PvP du ${formatDateTime(startsAt)} créé et annoncé sur Discord.`, eventId };
      }
      case "mission": {
        // It starts when the officer published it in game, and the website was told later.
        const now = clock();
        const startsAt = change.madeAt !== undefined && change.madeAt < now ? change.madeAt : now;
        const type = change.type as MissionType;
        const title = change.title.trim() || (MISSION_TYPE_LABELS[type]?.title ?? "");
        const missionId = await missions.create(
          author.member,
          { type, title, reward: change.reward, startsAt, endsAt: missionEnd(startsAt, change.days) },
          change.reason,
        );
        await missionAnnouncements.announceQuietly(missionId);
        return { message: `Quête « ${title} » publiée et annoncée sur Discord.`, missionId };
      }
      case "duel": {
        const scheduledAt = startOf(change.date, change.time);
        const duelId = await duels.challenge(author.member, {
          opponentId: change.opponentId,
          scheduledAt,
          place: change.place,
        });
        return { message: DUEL_DONE.challenged, duelId };
      }
      case "duelAnswer":
        await duels.answer(author.member, change.duelId, change.accept);
        return { message: change.accept ? DUEL_DONE.accepted : DUEL_DONE.refused };
      case "duelCancel":
        await duels.cancel(author.member, change.duelId);
        return { message: DUEL_DONE.cancelled };
      case "duelConcede":
        await duels.concede(author.member, change.duelId);
        return { message: DUEL_DONE.conceded };
      case "duelResult":
        await duels.recordFromGame(author.member, change.duelId, change.winner, change.loser);
        return { message: `Duel joué : ${change.winner} gagne.` };
    }
  }

  /** The author's character and member, when the character is linked to one. */
  function findAuthor(name: string) {
    return unitOfWork.run(async ({ characters, members }) => {
      const character = (await characters.listAll()).find((candidate) => fullName(candidate) === name);
      const member = character?.memberId === undefined ? undefined : await members.findById(character.memberId);
      return character && member && { character, member };
    });
  }

  /** Whether what the change is about exists: its answer goes back with its data. */
  async function inScope(change: GameChange): Promise<boolean> {
    if (isCreation(change)) {
      return true;
    }
    return unitOfWork.run(async ({ events: storedEvents, bets: storedBets, duels: storedDuels }) => {
      if (isDuelChange(change)) {
        return (await storedDuels.findById(change.duelId)) !== undefined;
      }
      if (isBetChange(change)) {
        return (await storedBets.findById(change.betId)) !== undefined;
      }
      return (await storedEvents.findById(change.eventId)) !== undefined;
    });
  }

  /** What becomes of one change; undefined when it cannot be kept (unknown event, or relayed by a member). */
  async function receiveOne(sender: Member, change: GameChange): Promise<GameChangeOutcome | undefined> {
    const known = {
      outcome: await unitOfWork.run(({ gameChanges }) => gameChanges.find(change.id)),
      scope: await inScope(change),
    };
    if (known.outcome !== undefined || !known.scope) {
      return known.outcome;
    }
    const author = await findAuthor(change.author);
    // Only an officer relays the changes of other players: their addon heard them from the author in game.
    if (author !== undefined && author.member.id !== sender.id && !canManageRaids(sender.roles)) {
      return undefined;
    }
    const betId = isBetChange(change) ? change.betId : undefined;
    const duelId = isDuelChange(change) ? change.duelId : undefined;
    const base = {
      id: change.id,
      eventId: isCreation(change) || betId !== undefined || duelId !== undefined ? undefined : change.eventId,
      betId,
      duelId,
      missionId: undefined,
      author: change.author,
    };
    let outcome: GameChangeOutcome;
    if (author === undefined) {
      outcome = { ...base, accepted: false, message: UNKNOWN_AUTHOR };
    } else {
      try {
        const done = await perform(author, change);
        outcome = {
          ...base,
          eventId: done.eventId ?? base.eventId,
          betId: done.betId ?? base.betId,
          duelId: done.duelId ?? base.duelId,
          missionId: done.missionId,
          accepted: true,
          message: done.message,
        };
      } catch (error) {
        if (!(error instanceof ApplicationError)) {
          throw error;
        }
        outcome = { ...base, accepted: false, message: error.message };
      }
    }
    await unitOfWork.run(({ gameChanges }) => gameChanges.save(outcome, sender.id, clock()));
    return outcome;
  }

  return {
    /**
     * The changes made in game that a companion sends (P7.5, P9): its member's own, and for an officer those relayed
     * from other players. Each is done once, as its author would on the website, rights checked, the latest change
     * winning; what became of it goes back to the game with the event's data.
     */
    async receive(sender: Member, changes: readonly GameChange[]): Promise<GameChangeOutcome[]> {
      const outcomes: GameChangeOutcome[] = [];
      for (const change of changes) {
        const outcome = await receiveOne(sender, change);
        if (outcome !== undefined) {
          outcomes.push(outcome);
        }
      }
      return outcomes;
    },
  };
}
