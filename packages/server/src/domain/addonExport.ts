import { fullName, type Character } from "./characters.ts";
import { eventAudience } from "./eventRoles.ts";
import type { GuildEvent } from "./events.ts";
import { equipClasses } from "./equipment.ts";
import type { GameChangeOutcome } from "./gameChanges.ts";
import type { JournalEntry } from "./journal.ts";
import { describeJournalEntry, JOURNAL_ACTION_LABELS } from "./journalDescriptions.ts";
import { eventTitle } from "./labels.ts";
import type { Signup } from "./signups.ts";
import { flag, line, seconds, text } from "./addonText.ts";
import { choiceContextOf, reusableReserves, type BoardItem } from "./softReserves.ts";

/** First line of an event exported for the addon (contract with VXV_Raid); the number is the format version. */
export const ADDON_EVENT_HEADER = "VXV-RAID-5";

export interface AddonEventFacts {
  event: GuildEvent;
  signups: readonly Signup[];
  board: readonly BoardItem[];
  /** Each signed-up character's reserves at its last raid on the same raids, those it obtained aside. */
  previousReserves: ReadonlyMap<string, readonly number[]>;
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

/**
 * The event as the officers paste it into the addon, one record per line:
 * E;event id;start (Unix seconds);export (Unix seconds);SR per player;title;raid ids separated by commas;who may sign
 *   up (eventAudience)
 * O;officer character
 * I;item id;item name;boss;1 when excluded from SR
 * W;item id;the class tokens that may equip it, separated by commas (an item without this line suits every class)
 * S;character;class token;role;status;1 for a reroll;spec;item id:SR+ bonus,…
 * U;character;the item ids of its last raid's reserves it may reuse, separated by commas
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
      text(eventTitle(event)),
      event.raids.map((raid) => raid.id).join(","),
      text(eventAudience(event.role)),
    ),
    ...facts.officers.map((officer) => line("O", fullName(officer))),
    ...board
      .filter((item) => item.excluded || item.reservedBy.length > 0)
      .map((item) => line("I", item.itemId, text(item.name), text(item.bossName), flag(item.excluded))),
    ...board.flatMap((item) => {
      const classes = equipClasses(item.kind);
      return classes === undefined ? [] : [line("W", item.itemId, classes.join(","))];
    }),
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
    ...facts.signups.flatMap((signup) => {
      const reusable = reusableReserves(
        facts.previousReserves.get(signup.characterId) ?? [],
        choiceContextOf(board, event.softReservesPerPlayer, signup.characterClass),
      );
      return reusable.length === 0 ? [] : [line("U", signup.characterName, reusable.join(","))];
    }),
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
