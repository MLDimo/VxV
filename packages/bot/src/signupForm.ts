import { fullName, type Application, type Character, type Member, type RaidEvent, type Signup } from "@vxv/server";
import { classLabel } from "@vxv/server/domain/characterClasses";
import { raidTitle, ROLE_LABELS, SPEC_SUGGESTIONS, STATUS_LABELS } from "@vxv/server/domain/labels";
import { MAX_SPEC_LENGTH, SIGNUP_ROLES, SIGNUP_STATUSES, type SignupStatus } from "@vxv/server/domain/signups";
import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
  type APIInteractionResponse,
  type APIMessageComponentGuildInteraction,
  type APIModalInteractionResponseCallbackData,
  type APIModalSubmissionComponent,
  type APIModalSubmitGuildInteraction,
} from "discord-api-types/v10";
import type { BotContext } from "./commands.ts";
import { actingMember } from "./members.ts";
import { ephemeral } from "./responses.ts";

/** The sign-up form of an event, read back when the member sends it. */
export const SIGNUP_FORM_PREFIX = "signup-form:";

const FIELDS = { character: "character", role: "role", status: "status", spec: "spec" } as const;
/** Discord's limits for a modal title and the options of a select menu. */
const MAX_TITLE_LENGTH = 45;
const MAX_OPTIONS = 25;
const DEFAULT_STATUS: SignupStatus = "present";

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
  const suggestions = SPEC_SUGGESTIONS[chosen?.characterClass ?? ""] ?? [];
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
          type: ComponentType.TextInput,
          custom_id: FIELDS.spec,
          style: TextInputStyle.Short,
          max_length: MAX_SPEC_LENGTH,
          value: current?.spec,
          placeholder: suggestions.length > 0 ? `ex. ${suggestions.join(", ")}` : undefined,
        },
      },
    ],
  };
}

/** The values the member sent, by field. */
function submittedValues(components: readonly APIModalSubmissionComponent[]): Map<string, string> {
  const values = new Map<string, string>();
  for (const container of components) {
    const inner =
      container.type === ComponentType.Label
        ? [container.component]
        : container.type === ComponentType.ActionRow
          ? container.components
          : [];
    for (const field of inner) {
      if ("values" in field) {
        values.set(field.custom_id, field.values[0] ?? "");
      } else if ("value" in field && typeof field.value === "string") {
        values.set(field.custom_id, field.value);
      }
    }
  }
  return values;
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
  await app.signups.signUp(member, eventId, {
    characterId: values.get(FIELDS.character) ?? "",
    role: values.get(FIELDS.role) ?? "",
    spec: values.get(FIELDS.spec) ?? "",
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
