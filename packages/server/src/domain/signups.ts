import type { Character } from "./characters.ts";

export const SIGNUP_ROLES = ["tank", "healer", "dps"] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

export const SIGNUP_STATUSES = ["present", "maybe", "late", "bench", "absent"] as const;
export type SignupStatus = (typeof SIGNUP_STATUSES)[number];

/** Players expected in the raid: they count in the composition. */
const COMING_STATUSES: ReadonlySet<SignupStatus> = new Set(["present", "late"]);

export function isComing(status: SignupStatus): boolean {
  return COMING_STATUSES.has(status);
}

export const MAX_SPEC_LENGTH = 30;

export interface SignupChoice {
  characterId: string;
  role: SignupRole;
  spec: string;
  status: SignupStatus;
}

export interface Signup extends SignupChoice {
  eventId: string;
  memberId: string;
  characterName: string;
  characterClass: string;
  /** When the character first signed up, kept through later changes. */
  signedUpAt: Date;
}

/** Each sign-up's number in the order of arrival, from 1, by character id: the event's Discord message shows it. */
export function arrivalNumbers(signups: readonly Signup[]): Map<string, number> {
  const arrived = [...signups].sort(
    (left, right) =>
      left.signedUpAt.getTime() - right.signedUpAt.getTime() || left.characterId.localeCompare(right.characterId),
  );
  return new Map(arrived.map((signup, index) => [signup.characterId, index + 1]));
}

function isOneOf<Value extends string>(values: readonly Value[], candidate: string): candidate is Value {
  return (values as readonly string[]).includes(candidate);
}

export type SignupCheck = { valid: true; choice: SignupChoice } | { valid: false; refusal: string };

function refuse(refusal: string): SignupCheck {
  return { valid: false, refusal };
}

/** Validates a sign-up as typed in a form: the member's own guild character, a known role, spec and status. */
export function checkSignup(
  input: { characterId: string; role: string; spec: string; status: string },
  ownCharacters: readonly Character[],
  eventStartsAt: Date,
  now: Date,
): SignupCheck {
  if (now.getTime() >= eventStartsAt.getTime()) {
    return refuse("Le raid a commencé : les inscriptions sont closes.");
  }
  const character = ownCharacters.find((candidate) => candidate.id === input.characterId);
  if (character === undefined) {
    return refuse("Choisissez l'un de vos personnages.");
  }
  if (!character.inGuild) {
    return refuse("Ce personnage ne fait plus partie de la guilde.");
  }
  const { role, status } = input;
  if (!isOneOf(SIGNUP_ROLES, role)) {
    return refuse("Choisissez un rôle : tank, soigneur ou DPS.");
  }
  const spec = input.spec.trim();
  if (spec.length === 0 || spec.length > MAX_SPEC_LENGTH) {
    return refuse(`Indiquez votre spécialisation (${MAX_SPEC_LENGTH} caractères au plus).`);
  }
  if (!isOneOf(SIGNUP_STATUSES, status)) {
    return refuse("Choisissez un statut.");
  }
  return { valid: true, choice: { characterId: character.id, role, spec, status } };
}

export interface Composition {
  /** Expected players (present or late) by role. */
  byRole: Record<SignupRole, number>;
  /** Expected players by class token. */
  byClass: Record<string, number>;
  byStatus: Record<SignupStatus, number>;
}

function zeroCounts<Key extends string>(keys: readonly Key[]): Record<Key, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<Key, number>;
}

export function composition(signups: readonly Signup[]): Composition {
  const result: Composition = {
    byRole: zeroCounts(SIGNUP_ROLES),
    byClass: {},
    byStatus: zeroCounts(SIGNUP_STATUSES),
  };
  for (const signup of signups) {
    result.byStatus[signup.status] += 1;
    if (isComing(signup.status)) {
      result.byRole[signup.role] += 1;
      result.byClass[signup.characterClass] = (result.byClass[signup.characterClass] ?? 0) + 1;
    }
  }
  return result;
}
