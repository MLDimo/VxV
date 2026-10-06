import { fullName, type Application, type Character, type Member, type RaidEvent, type Signup } from "@vxv/server";
import { classLabel } from "@vxv/server/domain/characterClasses";
import { raidTitle, ROLE_LABELS, SPEC_SUGGESTIONS, STATUS_LABELS } from "@vxv/server/domain/labels";
import { SIGNUP_ROLES, SIGNUP_STATUSES, type SignupStatus } from "@vxv/server/domain/signups";
import {
  ComponentType,
  InteractionResponseType,
  type APIInteractionResponse,
  type APIMessageComponentGuildInteraction,
  type APIModalInteractionResponseCallbackData,
  type APIModalSubmitGuildInteraction,
  type APISelectMenuOption,
} from "discord-api-types/v10";
import type { BotContext } from "./commands.ts";
import { actingMember } from "./members.ts";
import { submittedValues } from "./modalValues.ts";
import { ephemeral } from "./responses.ts";

/** The sign-up form of an event, read back when the member sends it. */
export const SIGNUP_FORM_PREFIX = "signup-form:";

const FIELDS = { character: "character", role: "role", status: "status", spec: "spec" } as const;
/** Discord's limits for a modal title and the options of a select menu. */
const MAX_TITLE_LENGTH = 45;
const MAX_OPTIONS = 25;
const DEFAULT_STATUS: SignupStatus = "present";
/** A spec option carries its class, so that a spec of another class than the character's is refused. */
const SPEC_VALUE_SEPARATOR = "|";
const WRONG_CLASS_SPEC =
  "Cette spécialisation n'est pas celle de la classe du personnage choisi : choisis-en une autre.";

/** The usual specs of the member's classes (the chosen character's first), and the current spec if it is another. */
function specOptions(
  characters: readonly Character[],
  chosen: Character | undefined,
  current: Signup | undefined,
): APISelectMenuOption[] {
  const classes = [...new Set([chosen, ...characters].flatMap((character) => character?.characterClass ?? []))];
  const options = classes.flatMap((characterClass) =>
    (SPEC_SUGGESTIONS[characterClass] ?? []).map((spec) => ({
      label: classes.length > 1 ? `${spec} · ${classLabel(characterClass)}` : spec,
      value: `${characterClass}${SPEC_VALUE_SEPARATOR}${spec}`,
      default: spec === current?.spec && characterClass === current.characterClass,
    })),
  );
  const listed = options.some((option) => option.default);
  const custom =
    current === undefined || listed
      ? []
      : [{ label: current.spec, value: `${SPEC_VALUE_SEPARATOR}${current.spec}`, default: true }];
  return [...custom, ...options].slice(0, MAX_OPTIONS);
}

/** The spec of an option, and its class when it is a usual spec. */
function readSpec(value: string): { characterClass: string; spec: string } {
  const [characterClass = "", ...spec] = value.split(SPEC_VALUE_SEPARATOR);
  return { characterClass, spec: spec.join(SPEC_VALUE_SEPARATOR) };
}

/** One modal holds the whole sign-up: character, role, status and specialisation, filled with the current one. */
export function signupForm(
  event: RaidEvent,
  characters: readonly Character[],
  current: Signup | undefined,
): APIModalInteractionResponseCallbackData {
  const chosen =
    characters.find((character) => character.id === current?.characterId) ??
    characters.find((character) => character.isMain) ??
    characters[0];
  const status = current?.status ?? DEFAULT_STATUS;
  return {
    custom_id: `${SIGNUP_FORM_PREFIX}${event.id}`,
    title: `Inscription · ${raidTitle(event.raids.map((raid) => raid.name))}`.slice(0, MAX_TITLE_LENGTH),
    components: [
      {
        type: ComponentType.Label,
        label: "Personnage",
        component: {
          type: ComponentType.StringSelect,
          custom_id: FIELDS.character,
          options: characters.slice(0, MAX_OPTIONS).map((character) => ({
            label: `${fullName(character)} · ${classLabel(character.characterClass)}`,
            value: character.id,
            default: character.id === chosen?.id,
          })),
        },
      },
      {
        type: ComponentType.Label,
        label: "Rôle",
        component: {
          type: ComponentType.StringSelect,
          custom_id: FIELDS.role,
          options: SIGNUP_ROLES.map((role) => ({
            label: `${ROLE_LABELS[role].icon} ${ROLE_LABELS[role].label}`,
            value: role,
            default: role === current?.role,
          })),
        },
      },
      {
        type: ComponentType.Label,
        label: "Statut",
        component: {
          type: ComponentType.StringSelect,
          custom_id: FIELDS.status,
          options: SIGNUP_STATUSES.map((value) => ({ label: STATUS_LABELS[value], value, default: value === status })),
        },
      },
      {
        type: ComponentType.Label,
        label: "Spécialisation",
        component: {
          type: ComponentType.StringSelect,
          custom_id: FIELDS.spec,
          options: specOptions(characters, chosen, current),
        },
      },
    ],
  };
}

/** The "S'inscrire" button: opens the form, or explains how to link a character first (P3.7). */
export async function openSignupForm(
  interaction: APIMessageComponentGuildInteraction,
  { app, linkChannelId }: BotContext,
  eventId: string,
): Promise<APIInteractionResponse> {
  const event = await app.events.getEvent(eventId);
  if (event === undefined) {
    return ephemeral("Cet événement n'existe plus.");
  }
  const member = await actingMember(interaction, app);
  const characters = (await app.characters.listMine(member)).filter((character) => character.inGuild);
  if (characters.length === 0) {
    return ephemeral(`Lie d'abord ton personnage avec /vxv_main dans <#${linkChannelId}>, puis inscris-toi.`);
  }
  return {
    type: InteractionResponseType.Modal,
    data: signupForm(event, characters, await app.signups.findMine(member, eventId)),
  };
}

/** The form sent: the sign-up is saved like on the website, and the event's message follows. */
export async function submitSignupForm(
  interaction: APIModalSubmitGuildInteraction,
  { app }: BotContext,
  eventId: string,
): Promise<APIInteractionResponse> {
  const values = submittedValues(interaction.data.components);
  const member = await actingMember(interaction, app);
  const characterId = values.get(FIELDS.character) ?? "";
  const { characterClass, spec } = readSpec(values.get(FIELDS.spec) ?? "");
  const character = (await app.characters.listMine(member)).find((candidate) => candidate.id === characterId);
  if (characterClass !== "" && character !== undefined && character.characterClass !== characterClass) {
    return ephemeral(WRONG_CLASS_SPEC);
  }
  await app.signups.signUp(member, eventId, {
    characterId,
    role: values.get(FIELDS.role) ?? "",
    spec,
    status: values.get(FIELDS.status) ?? "",
  });
  return ephemeral(await describeSignup(app, member, eventId));
}

/** What the member reads after sending the form. */
async function describeSignup(app: Application, member: Member, eventId: string): Promise<string> {
  const announced = await app.raidAnnouncements.announceQuietly(eventId);
  const signup = await app.signups.findMine(member, eventId);
  const summary =
    signup === undefined
      ? "Inscription enregistrée."
      : `Inscription enregistrée : ${signup.characterName}, ${ROLE_LABELS[signup.role].label} (${signup.spec}), ` +
        `${STATUS_LABELS[signup.status]}.`;
  return announced ? summary : `${summary} Le message du raid sera mis à jour à la prochaine inscription.`;
}
