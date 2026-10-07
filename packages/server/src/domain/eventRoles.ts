import { CLASS_ROLE_NAMES } from "./characterClasses.ts";
import { TITLES, titleRole } from "./titles.ts";

/** A role of the guild's Discord server. */
export interface ServerRole {
  id: string;
  name: string;
  /** @everyone, which everybody on the server holds. */
  everyone: boolean;
  /** Given by Discord itself (a bot's role, the boosters'), never by hand. */
  managed: boolean;
}

/** The Discord role an event is reserved to: only its holders may sign up. */
export interface EventRole {
  id: string;
  name: string;
}

/** A role an officer may reserve an event to; @everyone opens it to everybody on the guild's Discord server. */
export interface EventRoleChoice extends EventRole {
  everyone: boolean;
}

/** The name of the choice that opens an event to everybody. */
const EVERYBODY = "Tout le monde";

/** An event's role must be one of eventRoleChoices. */
export const ROLE_NOT_OFFERED =
  "Choisissez qui peut s'inscrire : tout le monde, ou un rôle proposé du serveur Discord.";

/** The roles VXV gives by itself: a member's class and the week's titles. */
const VXV_ROLE_NAMES: ReadonlySet<string> = new Set([
  ...CLASS_ROLE_NAMES,
  ...TITLES.map(({ name }) => titleRole(name)),
]);

/**
 * The roles an officer may reserve an event to: everybody first, then the server's roles by name, except the ones
 * Discord gives (bots, boosters) and the ones VXV gives (classes, titles).
 */
export function eventRoleChoices(roles: readonly ServerRole[]): EventRoleChoice[] {
  const everybody = roles.filter((role) => role.everyone).map(({ id }) => ({ id, name: EVERYBODY, everyone: true }));
  const others = roles
    .filter((role) => !role.everyone && !role.managed && !VXV_ROLE_NAMES.has(role.name))
    .map(({ id, name }) => ({ id, name, everyone: false }))
    .sort((left, right) => left.name.localeCompare(right.name, "fr"));
  return [...everybody, ...others];
}

/** The role an event chosen this way is reserved to: none when it is open to everybody. */
export function reservedRole({ id, name, everyone }: EventRoleChoice): EventRole | undefined {
  return everyone ? undefined : { id, name };
}

/** Who may sign up to an event: "Réservé à Raideur R1", or "Ouvert à tous". */
export function eventAudience(role: EventRole | undefined): string {
  return role === undefined ? "Ouvert à tous" : `Réservé à ${role.name}`;
}

/**
 * Why a member holding these Discord roles (undefined: no longer on the server) may not sign up to an event reserved
 * to this role, or undefined when they may.
 */
export function eventRoleRefusal(role: EventRole, heldRoleIds: readonly string[] | undefined): string | undefined {
  return heldRoleIds?.includes(role.id) ? undefined : `Ce raid est réservé au rôle Discord « ${role.name} ».`;
}
