import { fullName, type Character } from "../domain/characters.ts";
import type { NewRaidEvent } from "../domain/events.ts";
import { isBetChange, type GameChange, type GameChangeOutcome } from "../domain/gameChanges.ts";
import { formatDateTime, formatGold } from "../domain/labels.ts";
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
  events: { createEvent(officer: Member, event: NewRaidEvent, reason: string): Promise<string> };
  /** The event's message on Discord follows its sign-ups, and a new event gets one. */
  announcements: { announceQuietly(eventId: string): Promise<boolean> };
  bets: {
    create(officer: Member, input: NewBet, reason: string): Promise<string>;
    stake(member: Member, betId: string, choiceId: string, amount: number): Promise<{ bet: { choices: BetChoice[] } }>;
    withdraw(member: Member, betId: string): Promise<unknown>;
  };
  /** The bet's message on Discord follows its stakes. */
  betAnnouncements: { announceQuietly(betId: string): Promise<boolean> };
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
}: GameChangeDependencies) {
  /**
   * Does the change as its author's member would on the website; returns what the game tells the author, and the bet
   * it opened.
   */
  async function perform(
    author: { character: Character; member: Member },
    change: GameChange,
  ): Promise<{ message: string; betId?: string }> {
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
        const startsAt = parseRaidStart(change.date, change.time, clock());
        if (startsAt === undefined) {
          throw new ValidationError(UNREADABLE_START);
        }
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
        const closesAt = parseRaidStart(change.date, change.time, clock());
        if (closesAt === undefined) {
          throw new ValidationError(UNREADABLE_START);
        }
        const betId = await bets.create(
          author.member,
          { title: change.title, choices: change.choices, closesAt },
          change.reason,
        );
        await betAnnouncements.announceQuietly(betId);
        return { message: `Pari « ${change.title} » ouvert et annoncé sur Discord.`, betId };
      }
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

  /** What becomes of one change; undefined when it cannot be kept (unknown event, or relayed by a member). */
  async function receiveOne(sender: Member, change: GameChange): Promise<GameChangeOutcome | undefined> {
    const creation = change.kind === "event" || change.kind === "bet";
    const betId = isBetChange(change) ? change.betId : undefined;
    const known = await unitOfWork.run(async ({ gameChanges, events: storedEvents, bets: storedBets }) => ({
      outcome: await gameChanges.find(change.id),
      // The event or the bet the change is about must exist: the answer goes back with its data.
      scope:
        creation ||
        (betId === undefined
          ? (await storedEvents.findById(change.eventId)) !== undefined
          : (await storedBets.findById(betId)) !== undefined),
    }));
    if (known.outcome !== undefined || !known.scope) {
      return known.outcome;
    }
    const author = await findAuthor(change.author);
    // Only an officer relays the changes of other players: their addon heard them from the author in game.
    if (author !== undefined && author.member.id !== sender.id && !canManageRaids(sender.roles)) {
      return undefined;
    }
    const base = {
      id: change.id,
      eventId: creation || betId !== undefined ? undefined : change.eventId,
      betId,
      author: change.author,
    };
    let outcome: GameChangeOutcome;
    if (author === undefined) {
      outcome = { ...base, accepted: false, message: UNKNOWN_AUTHOR };
    } else {
      try {
        const done = await perform(author, change);
        outcome = { ...base, betId: done.betId ?? base.betId, accepted: true, message: done.message };
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
