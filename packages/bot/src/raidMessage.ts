import type { AnnouncedRaid, Signup } from "@vxv/server";
import { classLabel } from "@vxv/server/domain/characterClasses";
import { raidTitle, ROLE_LABELS, softReserveCount, STATUS_LABELS } from "@vxv/server/domain/labels";
import { composition, isComing, SIGNUP_ROLES, type SignupStatus } from "@vxv/server/domain/signups";
import {
  ButtonStyle,
  ComponentType,
  type APIEmbedField,
  type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { timestamp } from "./discordText.ts";

const EMBED_COLOR = 0x14b8a6;
/** Discord's limit for the text of an embed field. */
const MAX_FIELD_LENGTH = 1024;
const NOBODY = "—";
/** Players who answered without coming, listed after the composition. */
const OTHER_STATUSES: readonly SignupStatus[] = ["maybe", "bench", "absent"];

/** The sign-up button of an event's message, read back when a member clicks it. */
export const SIGNUP_BUTTON_PREFIX = "signup:";

export function eventUrl(siteUrl: string, eventId: string): string {
  return `${siteUrl}/evenements/${eventId}`;
}

/** One line per player, cut short with a count of the others when Discord's field limit is reached. */
function playerLines(signups: readonly Signup[]): string {
  if (signups.length === 0) {
    return NOBODY;
  }
  const lines = signups.map(
    (signup) => `${signup.characterName} (${signup.spec})${signup.status === "late" ? " ⏰" : ""}`,
  );
  let text = "";
  for (const [index, line] of lines.entries()) {
    const rest = `… et ${lines.length - index} autres`;
    const next = text === "" ? line : `${text}\n${line}`;
    if (next.length + rest.length + 1 > MAX_FIELD_LENGTH) {
      return `${text}\n${rest}`;
    }
    text = next;
  }
  return text;
}

function classSummary(byClass: Record<string, number>): string {
  const entries = Object.entries(byClass).sort(([, left], [, right]) => right - left);
  return entries.length === 0 ? NOBODY : entries.map(([token, total]) => `${classLabel(token)} ${total}`).join(" · ");
}

/** The event's sign-up message: date, soft reserves, composition by role and class, other answers. */
export function raidMessage({ event, signups }: AnnouncedRaid, siteUrl: string): RESTPostAPIChannelMessageJSONBody {
  const coming = signups.filter((signup) => isComing(signup.status));
  const { byClass } = composition(signups);
  const roleFields: APIEmbedField[] = SIGNUP_ROLES.map((role) => {
    const players = coming.filter((signup) => signup.role === role);
    return {
      name: `${ROLE_LABELS[role].icon} ${ROLE_LABELS[role].label} · ${players.length}`,
      value: playerLines(players),
      inline: true,
    };
  });
  const otherFields: APIEmbedField[] = OTHER_STATUSES.flatMap((status) => {
    const players = signups.filter((signup) => signup.status === status);
    return players.length === 0
      ? []
      : [{ name: `${STATUS_LABELS[status]} · ${players.length}`, value: playerLines(players) }];
  });
  const url = eventUrl(siteUrl, event.id);
  return {
    embeds: [
      {
        title: raidTitle(event.raids.map((raid) => raid.name)),
        url,
        description: `📅 ${timestamp(event.startsAt, "F")} (${timestamp(event.startsAt, "R")})\n🎯 ${softReserveCount(event.softReservesPerPlayer)} par joueur`,
        color: EMBED_COLOR,
        fields: [...roleFields, { name: "Classes", value: classSummary(byClass) }, ...otherFields],
        footer: { text: "Inscris-toi avec le bouton ci-dessous, ou sur le site." },
      },
    ],
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Primary,
            label: "S'inscrire",
            custom_id: `${SIGNUP_BUTTON_PREFIX}${event.id}`,
          },
          { type: ComponentType.Button, style: ButtonStyle.Link, label: "Voir sur le site", url },
        ],
      },
    ],
    allowed_mentions: { parse: [] },
  };
}
