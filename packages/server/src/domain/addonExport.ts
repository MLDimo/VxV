import { fullName, type Character } from "./characters.ts";
import type { RaidEvent } from "./events.ts";
import type { GameChangeOutcome } from "./gameChanges.ts";
import type { JournalEntry } from "./journal.ts";
import { describeJournalEntry, JOURNAL_ACTION_LABELS } from "./journalDescriptions.ts";
import { raidTitle } from "./labels.ts";
import type { Signup } from "./signups.ts";
import type { BoardItem } from "./softReserves.ts";

/** First line of an event exported for the addon (contract with VXV_Raid); the number is the format version. */
export const ADDON_EVENT_HEADER = "VXV-RAID-2";

const MS_PER_SECOND = 1000;

export interface AddonEventFacts {
  event: RaidEvent;
  signups: readonly Signup[];
  board: readonly BoardItem[];
  /** Characters of the officers and the guild master: the addon takes the event's data from them only. */
  officers: readonly Character[];
  /** Main characters: a sign-up with another character is a reroll, invited by hand. */
  mainCharacterIds: ReadonlySet<string>;
  /** Officer actions on the event, oldest first. */
  journal: readonly JournalEntry[];
  /** What became of the changes made in game, in the order received. */
  changes: readonly GameChangeOutcome[];
  exportedAt: Date;
}

function seconds(date: Date): number {
  return Math.floor(date.getTime() / MS_PER_SECOND);
}

/** Free text in one field: the separators of the format become commas. */
function text(value: string): string {
  return value
    .split(/[;\r\n]+/)
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join(", ");
}

function line(...fields: readonly (string | number)[]): string {
  return fields.join(";");
}

function flag(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * The event as the officers paste it into the addon, one record per line:
 * E;event id;start (Unix seconds);export (Unix seconds);SR per player;title;raid ids separated by commas
 * O;officer character
 * I;item id;item name;boss;1 when excluded from SR
 * S;character;class token;role;status;1 for a reroll;spec;item id:SR+ bonus,…
 * J;time (Unix seconds);officer;what changed;reason
 * C;change id;1 when done, 0 when refused;message
 * Items are those reserved or excluded: the raids' loot comes with the addon's data packs. The addon parses the
 * lines in this order.
 */
export function formatAddonEvent(facts: AddonEventFacts): string {
  const { event, board } = facts;
  const reservesOf = (characterId: string) =>
    board.flatMap((item) =>
      item.reservedBy
        .filter((reserver) => reserver.characterId === characterId)
        .map((reserver) => `${item.itemId}:${reserver.bonus}`),
    );
  return [
    ADDON_EVENT_HEADER,
    line(
      "E",
      event.id,
      seconds(event.startsAt),
      seconds(facts.exportedAt),
      event.softReservesPerPlayer,
      text(raidTitle(event.raids.map((raid) => raid.name))),
      event.raids.map((raid) => raid.id).join(","),
    ),
    ...facts.officers.map((officer) => line("O", fullName(officer))),
    ...board
      .filter((item) => item.excluded || item.reservedBy.length > 0)
      .map((item) => line("I", item.itemId, text(item.name), text(item.bossName), flag(item.excluded))),
    ...facts.signups.map((signup) =>
      line(
        "S",
        signup.characterName,
        signup.characterClass,
        signup.role,
        signup.status,
        flag(!facts.mainCharacterIds.has(signup.characterId)),
        text(signup.spec),
        reservesOf(signup.characterId).join(","),
      ),
    ),
    ...facts.journal.map((entry) =>
      line(
        "J",
        seconds(entry.occurredAt),
        text(entry.actorName),
        text(`${JOURNAL_ACTION_LABELS[entry.action]} : ${describeJournalEntry(entry)}`),
        text(entry.reason),
      ),
    ),
    ...facts.changes.map((change) => line("C", change.id, flag(change.accepted), text(change.message))),
  ].join("\n");
}
