import type { EventRole } from "./eventRoles.ts";

export interface RaidSummary {
  id: string;
  name: string;
}

/** A raid night, or a PvP outing (owner's request of 7 October): both signed up the same way. */
export const EVENT_KINDS = ["raid", "pvp"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export interface GuildEvent {
  id: string;
  kind: EventKind;
  /** A PvP outing's title; a raid night is named after its raids (eventTitle). */
  title: string | undefined;
  startsAt: Date;
  /** None for a PvP outing, which has no loot. */
  softReservesPerPlayer: number;
  /** One or several raids played the same evening, by name; none for a PvP outing. */
  raids: RaidSummary[];
  /** The Discord role whose holders alone may sign up; none: everybody on the guild's Discord server. */
  role: EventRole | undefined;
  /** Sign-up message published by the bot on Discord, once it exists. */
  discordMessageId: string | undefined;
}

/** A raid night as an officer plans it, on the website, with Discord's /vxv_raid or in game. */
export interface NewRaidEvent {
  startsAt: Date;
  raidIds: string[];
  softReservesPerPlayer: number;
  /** The Discord role chosen among eventRoleChoices: its holders alone may sign up (@everyone: everybody). */
  roleId: string;
}

/** A PvP outing as an officer plans it, on the website or with Discord's /vxv_pvp: its title instead of raids. */
export interface NewPvpEvent {
  title: string;
  startsAt: Date;
  /** As a raid night's. */
  roleId: string;
}

/** An event as it is kept: the role chosen, found on the guild's Discord server. */
export interface PlannedEvent extends Omit<NewRaidEvent, "roleId"> {
  kind: EventKind;
  title: string | undefined;
  role: EventRole | undefined;
}

export const DEFAULT_SOFT_RESERVES = 1;
export const MAX_SOFT_RESERVES = 10;

/** The event's page on the website: a raid night's, or a PvP outing's. */
export function eventPath({ id, kind }: Pick<GuildEvent, "id" | "kind">): string {
  return kind === "pvp" ? `/pvp/evenements/${id}` : `/evenements/${id}`;
}

/** Upcoming events stay listed a few hours after their start, while the raid is being played. */
export const EVENT_LISTED_AFTER_START_MS = 6 * 60 * 60 * 1000;

export const MAX_EVENT_TITLE_LENGTH = 60;

/** Why an event cannot start then, or undefined. */
function startRefusal(startsAt: Date, now: Date): string | undefined {
  if (Number.isNaN(startsAt.getTime())) {
    return "La date et l'heure de l'événement sont invalides.";
  }
  if (startsAt.getTime() <= now.getTime()) {
    return "L'événement doit commencer dans le futur.";
  }
  return undefined;
}

/** Why an officer may not create this raid night, or undefined when it is valid. */
export function newEventRefusal(event: NewRaidEvent, now: Date, knownRaidIds: ReadonlySet<string>): string | undefined {
  const refusal = startRefusal(event.startsAt, now);
  if (refusal !== undefined) {
    return refusal;
  }
  if (event.raidIds.length === 0) {
    return "Choisissez au moins un raid.";
  }
  if (event.raidIds.some((raidId) => !knownRaidIds.has(raidId))) {
    return "Un des raids choisis n'existe pas.";
  }
  const count = event.softReservesPerPlayer;
  if (!Number.isInteger(count) || count < DEFAULT_SOFT_RESERVES || count > MAX_SOFT_RESERVES) {
    return `Le nombre de SR par joueur doit être compris entre ${DEFAULT_SOFT_RESERVES} et ${MAX_SOFT_RESERVES}.`;
  }
  return undefined;
}

/** Why an officer may not create this PvP outing, or undefined when it is valid. */
export function newPvpEventRefusal(event: NewPvpEvent, now: Date): string | undefined {
  const title = event.title.trim();
  if (title === "" || title.length > MAX_EVENT_TITLE_LENGTH) {
    return `Donnez un titre à la sortie (${MAX_EVENT_TITLE_LENGTH} caractères au plus).`;
  }
  return startRefusal(event.startsAt, now);
}
