import { fullName, type Character, type CharacterName } from "./characters.ts";
import { TextFormatError } from "./textFormat.ts";

/** First line of a roster exported by the officers' addon; the number is the format version. */
export const ROSTER_HEADER = "VXV-ROSTER-1";

const FIELD_SEPARATOR = ";";
const FIELD_COUNT = 3;
const CLASS_TOKEN = /^[A-Z]+$/;

export interface RosterEntry extends CharacterName {
  characterClass: string;
}

export class RosterFormatError extends TextFormatError {}

function characterKey(character: CharacterName): string {
  return fullName(character);
}

/** Reads "Prénom;Nom;CLASSE" lines under the header, reporting every problem with its line number. */
export function parseRoster(text: string): RosterEntry[] {
  const lines = text.split(/\r?\n/).map((line, index) => ({ number: index + 1, content: line.trim() }));
  const filled = lines.filter((line) => line.content.length > 0);
  const [header, ...rows] = filled;
  if (header?.content !== ROSTER_HEADER) {
    throw new RosterFormatError([`La liste doit commencer par la ligne ${ROSTER_HEADER} : copiez-la depuis l'addon.`]);
  }

  const problems: string[] = [];
  const entries: RosterEntry[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const fields = row.content.split(FIELD_SEPARATOR).map((field) => field.trim());
    const [firstName = "", lastName = "", characterClass = ""] = fields;
    if (fields.length !== FIELD_COUNT || !firstName || !lastName) {
      problems.push(`Ligne ${row.number} : format attendu Prénom;Nom;CLASSE.`);
      continue;
    }
    if (!CLASS_TOKEN.test(characterClass)) {
      problems.push(`Ligne ${row.number} : classe inconnue « ${characterClass} ».`);
      continue;
    }
    const entry = { firstName, lastName, characterClass };
    if (seen.has(characterKey(entry))) {
      problems.push(`Ligne ${row.number} : ${fullName(entry)} apparaît deux fois.`);
      continue;
    }
    seen.add(characterKey(entry));
    entries.push(entry);
  }
  if (problems.length === 0 && entries.length === 0) {
    problems.push("La liste ne contient aucun personnage.");
  }
  if (problems.length > 0) {
    throw new RosterFormatError(problems);
  }
  return entries;
}

export interface RosterImportPlan {
  added: RosterEntry[];
  classChanged: { character: Character; characterClass: string }[];
  /** In the guild until now, absent from the new roster. */
  left: Character[];
  /** Had left, present again in the new roster. */
  rejoined: Character[];
}

/** What a roster import changes, compared with the characters already known. */
export function planRosterImport(known: readonly Character[], roster: readonly RosterEntry[]): RosterImportPlan {
  const knownByKey = new Map(known.map((character) => [characterKey(character), character]));
  const rosterKeys = new Set(roster.map(characterKey));
  const plan: RosterImportPlan = { added: [], classChanged: [], left: [], rejoined: [] };
  for (const entry of roster) {
    const character = knownByKey.get(characterKey(entry));
    if (character === undefined) {
      plan.added.push(entry);
      continue;
    }
    if (character.characterClass !== entry.characterClass) {
      plan.classChanged.push({ character, characterClass: entry.characterClass });
    }
    if (!character.inGuild) {
      plan.rejoined.push(character);
    }
  }
  plan.left = known.filter((character) => character.inGuild && !rosterKeys.has(characterKey(character)));
  return plan;
}

/** Names affected by an import, as recorded in the journal. */
export interface RosterImportSummary {
  added: string[];
  left: string[];
  rejoined: string[];
  classChanged: string[];
  inGuild: number;
}

export function summarizeRosterImport(plan: RosterImportPlan, rosterSize: number): RosterImportSummary {
  return {
    added: plan.added.map(fullName),
    left: plan.left.map(fullName),
    rejoined: plan.rejoined.map(fullName),
    classChanged: plan.classChanged.map(({ character }) => fullName(character)),
    inGuild: rosterSize,
  };
}

/** True when the import changes nothing: nothing to write, nothing to journal. */
export function isEmptyRosterPlan(plan: RosterImportPlan): boolean {
  return (
    plan.added.length === 0 && plan.classChanged.length === 0 && plan.left.length === 0 && plan.rejoined.length === 0
  );
}

/** Departures an automatic import accepts at once, whatever the guild's size… */
const AUTOMATIC_DEPARTURES = 5;
/** …or this share of the guild. */
const AUTOMATIC_DEPARTURE_SHARE = 0.1;

/**
 * A roster read in game that would mark many characters as gone looks incomplete (the client knew only part of
 * the guild): an automatic import refuses it, an officer may still import it on the website.
 */
export function looksIncomplete(plan: RosterImportPlan, inGuildBefore: number): boolean {
  return plan.left.length > Math.max(AUTOMATIC_DEPARTURES, Math.floor(inGuildBefore * AUTOMATIC_DEPARTURE_SHARE));
}
