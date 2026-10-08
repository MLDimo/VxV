import type { AnnouncedEvent, EventKind, GuildEvent, Signup } from "@vxv/server";
import { colorValue, COLORS } from "@vxv/design";
import { classLabel, CLASS_LABELS } from "@vxv/server/domain/characterClasses";
import { eventAudience } from "@vxv/server/domain/eventRoles";
import { eventPath } from "@vxv/server/domain/events";
import { eventTitle, ROLE_LABELS, softReserveCount, STATUS_LABELS } from "@vxv/server/domain/labels";
import { arrivalNumbers, composition, isComing, SIGNUP_ROLES, type SignupStatus } from "@vxv/server/domain/signups";
import {
  ButtonStyle,
  ComponentType,
  type APIEmbed,
  type APIEmbedField,
  type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { squared, timestamp } from "./discordText.ts";
import { classEmoji, emoji, ROLE_EMOJIS, specEmoji, STATUS_EMOJIS } from "./emojis.ts";

/** A raid night's amethyst; a PvP outing takes the colour of its place, the wanted posters' red. */
const EMBED_COLORS: Record<EventKind, number> = { raid: colorValue(COLORS.amethyst), pvp: colorValue(COLORS.loss) };
/** Discord's limits for the text of an embed field, and of the whole embed. */
const MAX_FIELD_LENGTH = 1024;
const MAX_EMBED_LENGTH = 6000;
/** What Discord shows of a field's name or value that must not be empty: nothing. */
const BLANK = "​";
/** Players who answered without coming, listed by name after the columns. */
const OTHER_STATUSES: readonly SignupStatus[] = ["maybe", "bench", "absent"];

/** The sign-up button of an event's message, read back when a member clicks it. */
export const SIGNUP_BUTTON_PREFIX = "signup:";

export function eventUrl(siteUrl: string, event: Pick<GuildEvent, "id" | "kind">): string {
  return `${siteUrl}${eventPath(event)}`;
}

/** Texts in as many fields as Discord's limit asks, the first under the name; nothing under it when empty. */
function listFields(name: string, texts: readonly string[], separator: string, inline: boolean): APIEmbedField[] {
  const values: string[] = [];
  for (const text of texts) {
    const last = values.at(-1);
    if (last !== undefined && last.length + separator.length + text.length <= MAX_FIELD_LENGTH) {
      values[values.length - 1] = `${last}${separator}${text}`;
    } else {
      values.push(text);
    }
  }
  return (values.length === 0 ? [BLANK] : values).map((value, index) => ({
    name: index === 0 ? name : BLANK,
    value,
    inline,
  }));
}

/** The event's embed: the composition in columns, Tank then each class, each player by order of arrival. */
function eventEmbed({ event, signups }: AnnouncedEvent, url: string, icons: boolean): APIEmbed {
  const numbers = arrivalNumbers(signups);
  const arrived = (signup: Signup) => `\`${String(numbers.get(signup.characterId))}\``;
  /** A player: the icon of their spec, else of their class with the spec written; a mark when late. */
  const playerLine = (signup: Signup) => {
    const spec = specEmoji(signup.characterClass, signup.spec);
    const icon = icons ? (spec ?? classEmoji(signup.characterClass)) : undefined;
    const name = `**${signup.characterName}**${icon !== undefined && icon === spec ? "" : ` (${signup.spec})`}`;
    const late = signup.status === "late" ? ` ${emoji(STATUS_EMOJIS.late)}` : "";
    return `${icon === undefined ? "" : `${emoji(icon)} `}${arrived(signup)} ${name}${late}`;
  };
  const byArrival = [...signups].sort(
    (left, right) => (numbers.get(left.characterId) ?? 0) - (numbers.get(right.characterId) ?? 0),
  );
  const coming = byArrival.filter((signup) => isComing(signup.status));
  const tanks = coming.filter((signup) => signup.role === "tank");
  const others = coming.filter((signup) => signup.role !== "tank");
  // Every class of the game, so that the columns stay in place; a class this version does not know, after them.
  const classes = [...new Set([...Object.keys(CLASS_LABELS), ...others.map((signup) => signup.characterClass)])];
  const column = (icon: string | undefined, label: string, players: readonly Signup[]) =>
    listFields(
      `${icon === undefined ? "" : `${icon} `}__${label}__ (${String(players.length)})`,
      players.map(playerLine),
      "\n",
      true,
    );
  const classColumns = classes.flatMap((characterClass) => {
    const icon = classEmoji(characterClass);
    const players = others.filter((signup) => signup.characterClass === characterClass);
    return column(icon && emoji(icon), classLabel(characterClass), players);
  });
  const answers = OTHER_STATUSES.flatMap((status) => {
    const players = byArrival.filter((signup) => signup.status === status);
    const name = `${emoji(STATUS_EMOJIS[status])} __${STATUS_LABELS[status]}__ (${String(players.length)})`;
    return players.length === 0
      ? []
      : listFields(
          name,
          players.map((signup) => `${arrived(signup)} ${signup.characterName}`),
          ", ",
          false,
        );
  });
  const { byRole } = composition(signups);
  return {
    title: squared(eventTitle(event)),
    url,
    description: [
      `⏳ ${timestamp(event.startsAt, "R")}`,
      // A PvP outing has no loot, hence no soft reserve.
      ...(event.softReservesPerPlayer > 0
        ? [`${emoji("sr")} ${softReserveCount(event.softReservesPerPlayer)} par joueur`]
        : []),
      // The role mentioned: Discord shows its name and colour, and a mention in an embed notifies nobody.
      `👥 ${eventAudience(event.role && { ...event.role, name: `<@&${event.role.id}>` })}`,
      SIGNUP_ROLES.map((role) => `${emoji(ROLE_EMOJIS[role])} ${String(byRole[role])}`).join(" · "),
    ].join("\n"),
    color: EMBED_COLORS[event.kind],
    fields: [
      { name: BLANK, value: `📅 ${timestamp(event.startsAt, "D")}`, inline: true },
      { name: BLANK, value: `🕐 ${timestamp(event.startsAt, "t")}`, inline: true },
      { name: BLANK, value: `👥 **${String(coming.length)}**`, inline: true },
      ...column(emoji(ROLE_EMOJIS.tank), ROLE_LABELS.tank.label, tanks),
      ...classColumns,
      ...answers,
    ],
    footer: { text: "Inscris-toi avec le bouton ci-dessous, ou sur le site." },
  };
}

/** The length Discord counts against an embed's limit. */
function embedLength({ title = "", description = "", fields = [], footer }: APIEmbed): number {
  return fields.reduce(
    (total, field) => total + field.name.length + field.value.length,
    title.length + description.length + (footer?.text.length ?? 0),
  );
}

/** The event's sign-up message, as Raid-Helper's; a crowded event drops its players' icons to stay within the limit. */
export function raidMessage(announced: AnnouncedEvent, siteUrl: string): RESTPostAPIChannelMessageJSONBody {
  const url = eventUrl(siteUrl, announced.event);
  const embed = eventEmbed(announced, url, true);
  return {
    embeds: [embedLength(embed) <= MAX_EMBED_LENGTH ? embed : eventEmbed(announced, url, false)],
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Primary,
            label: "S'inscrire",
            custom_id: `${SIGNUP_BUTTON_PREFIX}${announced.event.id}`,
          },
          { type: ComponentType.Button, style: ButtonStyle.Link, label: "Voir sur le site", url },
        ],
      },
    ],
    allowed_mentions: { parse: [] },
  };
}
