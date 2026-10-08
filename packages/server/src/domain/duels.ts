import type { DiscordMessage } from "./bets.ts";
import { count } from "./labels.ts";

/**
 * Duels (owner's request of 7 October): a member challenges another to a 1v1 at a date, a time and a place; the
 * guild bets on it once accepted, and the duels played make an Elo ranking.
 */

export const MAX_DUEL_PLACE_LENGTH = 60;

export interface Duel {
  id: string;
  challengerId: string;
  opponentId: string;
  scheduledAt: Date;
  /** Where the duel is fought, as the challenger wrote it: "Porte d'Orgrimmar". */
  place: string;
  createdAt: Date;
  /** The opponent's answer; undefined until they give it. */
  accepted: boolean | undefined;
  /** The guild's bet on the duel, opened when the opponent accepted. */
  betId: string | undefined;
  /** The member who won, once the duel is played. */
  winnerId: string | undefined;
  playedAt: Date | undefined;
  cancelledAt: Date | undefined;
  /** The duel's message on Discord, once published. */
  discordMessage: DiscordMessage | undefined;
}

/** A challenge as a member makes it. */
export interface NewDuel {
  opponentId: string;
  scheduledAt: Date;
  place: string;
}

export type DuelStatus = "proposed" | "refused" | "scheduled" | "played" | "cancelled";

export function duelStatus(duel: Duel): DuelStatus {
  if (duel.winnerId !== undefined) {
    return "played";
  }
  if (duel.cancelledAt !== undefined) {
    return "cancelled";
  }
  if (duel.accepted === undefined) {
    return "proposed";
  }
  return duel.accepted ? "scheduled" : "refused";
}

/** What the website and the game tell a member once their action on a duel is done. */
export const DUEL_DONE = {
  challenged: "Défi lancé : le joueur défié est prévenu sur Discord.",
  accepted: "Défi relevé : la guilde peut parier sur le duel.",
  refused: "Défi refusé.",
  cancelled: "Duel annulé : les mises sont rendues.",
  conceded: "Défaite enregistrée : le pari est réglé.",
  recorded: "Vainqueur enregistré : le pari est réglé.",
} as const;

const NOT_A_DUELIST = "Seuls les deux joueurs du duel peuvent le faire.";
const OVER = "Ce duel est terminé.";
export const DUELIST_STAKE = "Les joueurs d'un duel ne parient pas dessus.";

/** Whether the member plays the duel: they may not bet on it. */
export function isDuelist(duel: Duel, memberId: string): boolean {
  return memberId === duel.challengerId || memberId === duel.opponentId;
}

/** Why the member may not make this challenge, or undefined. */
export function newDuelRefusal(challengerId: string, duel: NewDuel, now: Date): string | undefined {
  if (duel.opponentId === challengerId) {
    return "Choisis un autre joueur que toi.";
  }
  if (Number.isNaN(duel.scheduledAt.getTime()) || duel.scheduledAt.getTime() <= now.getTime()) {
    return "Le duel doit avoir lieu dans le futur.";
  }
  const place = duel.place.trim();
  if (place === "" || place.length > MAX_DUEL_PLACE_LENGTH) {
    return `Indique le lieu du duel (${MAX_DUEL_PLACE_LENGTH} caractères au plus).`;
  }
  return undefined;
}

/** Why the member may not take up or turn down the challenge now, or undefined: the opponent, before the time. */
export function answerRefusal(duel: Duel, memberId: string, now: Date): string | undefined {
  if (memberId !== duel.opponentId) {
    return "Seul le joueur défié répond au défi.";
  }
  if (duelStatus(duel) !== "proposed") {
    return "Ce défi a déjà sa réponse.";
  }
  if (duel.scheduledAt.getTime() <= now.getTime()) {
    return "L'heure du duel est passée : lance un nouveau défi.";
  }
  return undefined;
}

/** Why the member may not call the duel off, or undefined: a duelist (or an officer), before it is played. */
export function cancelRefusal(duel: Duel, memberId: string | undefined): string | undefined {
  if (memberId !== undefined && !isDuelist(duel, memberId)) {
    return NOT_A_DUELIST;
  }
  const status = duelStatus(duel);
  return status === "proposed" || status === "scheduled" ? undefined : OVER;
}

/**
 * Why this winner cannot be recorded, or undefined: one of the duelists, of an accepted duel not played yet. The
 * loser concedes (memberId, the loser), an officer records it (no memberId).
 */
export function resultRefusal(duel: Duel, winnerId: string, memberId: string | undefined): string | undefined {
  if (memberId !== undefined && !isDuelist(duel, memberId)) {
    return NOT_A_DUELIST;
  }
  if (!isDuelist(duel, winnerId)) {
    return "Le vainqueur doit être l'un des deux joueurs.";
  }
  return duelStatus(duel) === "scheduled" ? undefined : "Ce duel n'attend pas de résultat.";
}

/** The other player of the duel. */
export function opponentOf(duel: Duel, memberId: string): string {
  return memberId === duel.challengerId ? duel.opponentId : duel.challengerId;
}

/**
 * Elo (owner's choices of 7 and 8 October): everybody starts at 0, so that a rating reads as the points won or lost; a
 * duel moves the ratings by K × (result − expected).
 */
export const ELO_START = 0;
export const ELO_K = 20;
const ELO_SCALE = 400;

/** The probability that a player rated `rating` beats one rated `opponent`: 1 / (1 + 10^((Rb − Ra) / 400)). */
export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / ELO_SCALE));
}

/** A duel played, as the ranking reads it. */
export interface DuelOutcome {
  winnerId: string;
  loserId: string;
  playedAt: Date;
}

export interface EloRating {
  memberId: string;
  /** Unrounded: the website and the addon round it. */
  rating: number;
  played: number;
  won: number;
}

/**
 * Every duelist's rating after the duels played, in the order they were played: the winner gains K × (1 − E), the
 * loser loses as much. Best first; at equal ratings, the most duels won first.
 */
export function eloRatings(outcomes: readonly DuelOutcome[]): EloRating[] {
  const ratings = new Map<string, EloRating>();
  const of = (memberId: string): EloRating => {
    const known = ratings.get(memberId) ?? { memberId, rating: ELO_START, played: 0, won: 0 };
    ratings.set(memberId, known);
    return known;
  };
  for (const outcome of [...outcomes].sort((left, right) => left.playedAt.getTime() - right.playedAt.getTime())) {
    const winner = of(outcome.winnerId);
    const loser = of(outcome.loserId);
    const change = ELO_K * (1 - expectedScore(winner.rating, loser.rating));
    winner.rating += change;
    loser.rating -= change;
    winner.played += 1;
    loser.played += 1;
    winner.won += 1;
  }
  return [...ratings.values()].sort((left, right) => right.rating - left.rating || right.won - left.won);
}

/** A record of the duels board: its label, its value as written, its holder. */
export interface DuelFeat {
  label: string;
  value: string;
  memberId: string;
}

/** The holder of the highest count, and that count; at equal counts, the first member id. Undefined when none. */
function best(counts: ReadonlyMap<string, number>): [string, number] | undefined {
  return [...counts].sort(([leftId, left], [rightId, right]) => right - left || leftId.localeCompare(rightId))[0];
}

/** The duels' records: the most duels won, the most played, the longest run of wins. None before a duel is played. */
export function duelFeats(outcomes: readonly DuelOutcome[]): DuelFeat[] {
  const won = new Map<string, number>();
  const played = new Map<string, number>();
  const run = new Map<string, number>();
  const longestRun = new Map<string, number>();
  const add = (counts: Map<string, number>, memberId: string) => counts.set(memberId, (counts.get(memberId) ?? 0) + 1);
  for (const outcome of [...outcomes].sort((left, right) => left.playedAt.getTime() - right.playedAt.getTime())) {
    add(won, outcome.winnerId);
    add(played, outcome.winnerId);
    add(played, outcome.loserId);
    add(run, outcome.winnerId);
    run.set(outcome.loserId, 0);
    longestRun.set(outcome.winnerId, Math.max(longestRun.get(outcome.winnerId) ?? 0, run.get(outcome.winnerId) ?? 0));
  }
  const feats: [string, Map<string, number>, (value: number) => string][] = [
    ["Plus de victoires", won, (value) => count(value, "victoire")],
    ["Plus de duels", played, (value) => count(value, "duel")],
    ["Plus longue série", longestRun, (value) => `${count(value, "victoire")} de suite`],
  ];
  return feats.flatMap(([label, counts, write]) => {
    const holder = best(counts);
    return holder === undefined ? [] : [{ label, value: write(holder[1]), memberId: holder[0] }];
  });
}
