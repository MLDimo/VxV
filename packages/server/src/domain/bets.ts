/**
 * Mutual bets (P11): every stake goes into one pool; the organisation takes its share, the rest is split between
 * the winners in proportion to their stakes. Amounts are whole gold pieces (po).
 */

export const MIN_STAKE = 1;
export const MIN_CHOICES = 2;
/** A Discord select menu lists 25 options at most; ten choices keep the message readable. */
export const MAX_CHOICES = 10;
export const MAX_BET_TITLE_LENGTH = 100;
export const MAX_CHOICE_LENGTH = 50;
/** The organisation's share of the pool, for the guild's cash. */
export const ORGANISATION_PERCENT = 10;
const PERCENT = 100;

export interface BetChoice {
  id: string;
  label: string;
}

export interface NewBet {
  title: string;
  choices: string[];
  closesAt: Date;
}

export interface Bet {
  id: string;
  title: string;
  /** In the order the officer gave them. */
  choices: BetChoice[];
  closesAt: Date;
  createdAt: Date;
  /** The bet's message on Discord, once published. */
  discordMessage: DiscordMessage | undefined;
}

export interface DiscordMessage {
  channelId: string;
  messageId: string;
}

/** Stakes are taken until the closing time. */
export function isOpen(bet: Pick<Bet, "closesAt">, now: Date): boolean {
  return now < bet.closesAt;
}

/** The choices an officer typed, trimmed, without the empty ones. */
export function cleanChoices(choices: readonly string[]): string[] {
  return choices.map((choice) => choice.trim()).filter((choice) => choice !== "");
}

/** Why a new bet cannot be opened, or undefined when it can. */
export function newBetRefusal(bet: NewBet, now: Date): string | undefined {
  const title = bet.title.trim();
  if (title === "" || title.length > MAX_BET_TITLE_LENGTH) {
    return `Donne au pari un titre de ${String(MAX_BET_TITLE_LENGTH)} caractères au plus.`;
  }
  if (bet.choices.length < MIN_CHOICES || bet.choices.length > MAX_CHOICES) {
    return `Un pari propose de ${String(MIN_CHOICES)} à ${String(MAX_CHOICES)} choix.`;
  }
  if (bet.choices.some((choice) => choice === "" || choice.length > MAX_CHOICE_LENGTH)) {
    return `Chaque choix compte ${String(MAX_CHOICE_LENGTH)} caractères au plus.`;
  }
  if (new Set(bet.choices.map((choice) => choice.toLocaleLowerCase("fr"))).size !== bet.choices.length) {
    return "Deux choix portent le même nom.";
  }
  if (Number.isNaN(bet.closesAt.getTime()) || bet.closesAt <= now) {
    return "L'heure de fermeture doit être à venir.";
  }
  return undefined;
}

/** Why a member cannot stake this amount on this choice now, or undefined when they can. */
export function stakeRefusal(
  bet: Pick<Bet, "choices" | "closesAt">,
  stake: { choiceId: string; amount: number; existing: Pick<Stake, "paidAt"> | undefined },
  now: Date,
): string | undefined {
  if (!isOpen(bet, now)) {
    return "Ce pari est fermé.";
  }
  if (!bet.choices.some((choice) => choice.id === stake.choiceId)) {
    return "Choisis l'un des choix du pari.";
  }
  if (!Number.isInteger(stake.amount) || stake.amount < MIN_STAKE) {
    return `Mise en pièces d'or entières, ${String(MIN_STAKE)} po au moins.`;
  }
  return stake.existing?.paidAt === undefined ? undefined : PAID_STAKE;
}

/** A paid stake no longer changes. */
export const PAID_STAKE = "Ta mise est déjà payée au trésorier : elle ne peut plus changer.";

/** A member's stake on a bet: one per member, on one choice. */
export interface Stake {
  id: string;
  betId: string;
  memberId: string;
  /** The member as the guild knows them: their main character, else their Discord name. */
  memberName: string;
  /** The main character's class token, for the class color; undefined without a main character. */
  memberClass: string | undefined;
  choiceId: string;
  amount: number;
  placedAt: Date;
  /** When the treasurer received the stake; a paid stake can no longer change. */
  paidAt: Date | undefined;
}

/** What the pool looks like on one choice. */
export interface ChoiceBook {
  choice: BetChoice;
  total: number;
  bettors: number;
  /** Part of the pool staked on the choice, from 0 to 1. */
  share: number;
  /** What one po staked on the choice brings back if it wins; undefined while nobody staked on it. */
  odds: number | undefined;
}

export interface BetBook {
  pool: number;
  bettors: number;
  choices: ChoiceBook[];
}

const sum = (amounts: readonly number[]) => amounts.reduce((total, amount) => total + amount, 0);

/**
 * A hundred times what the winners share when the choice staking `winning` po wins a pool of `pool` po: the pool
 * less the organisation's share, which never exceeds the losing stakes. Nobody on the winner: the organisation
 * takes everything; everybody on the winner: each gets their stake back and the organisation nothing. In
 * hundredths, to stay in whole numbers.
 */
function distributedHundredths(pool: number, winning: number): number {
  return PERCENT * pool - Math.min(ORGANISATION_PERCENT * pool, PERCENT * (pool - winning));
}

/** The pool, and each choice's stakes and odds, as they stand. */
export function betBook(bet: Pick<Bet, "choices">, stakes: readonly Stake[]): BetBook {
  const pool = sum(stakes.map((stake) => stake.amount));
  const choices = bet.choices.map((choice) => {
    const onChoice = stakes.filter((stake) => stake.choiceId === choice.id);
    const total = sum(onChoice.map((stake) => stake.amount));
    return {
      choice,
      total,
      bettors: onChoice.length,
      share: pool === 0 ? 0 : total / pool,
      odds: total === 0 ? undefined : distributedHundredths(pool, total) / (PERCENT * total),
    };
  });
  return { pool, bettors: stakes.length, choices };
}

/** What a stake brings back if its choice wins, as the pool stands, rounded down to the po. */
export function potentialGain(book: BetBook, choiceId: string, amount: number): number {
  const odds = book.choices.find((entry) => entry.choice.id === choiceId)?.odds;
  return odds === undefined ? 0 : Math.floor(amount * odds);
}

export type StakeOutcome = "won" | "lost" | "refunded";

export interface SettledStake {
  stakeId: string;
  outcome: StakeOutcome;
  /** What the stake brings back: the gain of a winner, the stake of a refund, nothing for a loser. */
  gain: number;
}

export interface Settlement {
  stakes: SettledStake[];
  /** The organisation's share, for the guild's cash: its percentage, and what the rounding down leaves. */
  organisation: number;
}

/** The result of a bet: each winner's gain, rounded down to the po, and what goes to the guild's cash. */
export function settle(stakes: readonly Stake[], winningChoiceId: string): Settlement {
  const pool = sum(stakes.map((stake) => stake.amount));
  const winning = sum(stakes.filter((stake) => stake.choiceId === winningChoiceId).map((stake) => stake.amount));
  const distributed = distributedHundredths(pool, winning);
  const settled = stakes.map((stake): SettledStake => {
    if (stake.choiceId !== winningChoiceId) {
      return { stakeId: stake.id, outcome: "lost", gain: 0 };
    }
    const gain = Math.floor((stake.amount * distributed) / (PERCENT * winning));
    return { stakeId: stake.id, outcome: "won", gain };
  });
  return { stakes: settled, organisation: pool - sum(settled.map((stake) => stake.gain)) };
}

/** A cancelled bet: every stake comes back to its member, nothing for the guild's cash. */
export function refund(stakes: readonly Stake[]): Settlement {
  return {
    stakes: stakes.map((stake) => ({ stakeId: stake.id, outcome: "refunded", gain: stake.amount })),
    organisation: 0,
  };
}

/**
 * What the treasurer owes the member once the bet is over: a stake not paid yet is deducted from its gain (a won
 * stake) or not refunded (a cancelled bet).
 */
export function payout(stake: Pick<Stake, "amount" | "paidAt">, settled: Pick<SettledStake, "outcome" | "gain">) {
  if (settled.outcome === "lost") {
    return 0;
  }
  return stake.paidAt === undefined ? settled.gain - stake.amount : settled.gain;
}

/** A lost stake that was never paid: a debt, which bars the member from betting until the treasurer has it. */
export function isDebt(stake: Pick<Stake, "paidAt">, outcome: StakeOutcome | undefined): boolean {
  return outcome === "lost" && stake.paidAt === undefined;
}
