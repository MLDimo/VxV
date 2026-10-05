import type { Member } from "../domain/members.ts";
import { canManageRaids } from "../domain/permissions.ts";
import {
  isEmptyRosterPlan,
  looksIncomplete,
  parseRoster,
  planRosterImport,
  summarizeRosterImport,
  type RosterEntry,
  type RosterImportPlan,
  type RosterImportSummary,
} from "../domain/roster.ts";
import { ForbiddenError } from "./errors.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { Repositories, UnitOfWork } from "./ports.ts";

/** Journal reason of the rosters the officers' companions send. */
export const COMPANION_ROSTER_REASON = "Liste de guilde envoyée par le compagnon";
const ROSTER_MARK = "roster";

/** What became of a roster sent by a companion. */
export type RosterUploadOutcome =
  | { kind: "imported"; summary: RosterImportSummary }
  | { kind: "unchanged" }
  | { kind: "older" }
  | { kind: "incomplete"; departures: number };

/** Aligns the characters on the roster and journals it. */
async function apply(
  { characters, journal }: Repositories,
  actor: Member,
  plan: RosterImportPlan,
  roster: readonly RosterEntry[],
  reason: string,
): Promise<RosterImportSummary> {
  await characters.add(plan.added);
  for (const { character, characterClass } of plan.classChanged) {
    await characters.changeClass(character.id, characterClass);
  }
  await characters.setInGuild(
    plan.left.map((character) => character.id),
    false,
  );
  await characters.setInGuild(
    plan.rejoined.map((character) => character.id),
    true,
  );
  const summary = summarizeRosterImport(plan, roster.length);
  await journal.record({
    actorId: actor.id,
    action: "roster.import",
    entity: "roster",
    entityId: "guild",
    before: null,
    after: summary,
    reason,
  });
  return summary;
}

export function createRoster({ unitOfWork }: { unitOfWork: UnitOfWork }) {
  return {
    /**
     * Aligns the guild characters on a roster exported by an officer's addon: new characters are added,
     * classes updated, and characters missing from the roster are marked as having left the guild.
     */
    async importRoster(actor: Member, text: string, reason: string): Promise<RosterImportSummary> {
      const motive = checkOfficerAction(actor, reason);
      const roster = parseRoster(text);
      return unitOfWork.run(async (repositories) => {
        const plan = planRosterImport(await repositories.characters.listAll(), roster);
        return apply(repositories, actor, plan, roster, motive);
      });
    },

    /**
     * The roster an officer's companion sends, as their addon read it at capturedAt (P7.4). Several officers send
     * theirs: an older copy than the last imported is ignored, and so is one that would mark many characters as
     * gone (read before the client knew the whole guild). The journal only records the rosters that change something.
     */
    async importFromCompanion(officer: Member, text: string, capturedAt: Date): Promise<RosterUploadOutcome> {
      if (!canManageRaids(officer.roles)) {
        throw new ForbiddenError();
      }
      const roster = parseRoster(text);
      return unitOfWork.run(async (repositories) => {
        const last = await repositories.syncMarks.find(ROSTER_MARK);
        if (last !== undefined && capturedAt.getTime() <= last.getTime()) {
          return { kind: "older" };
        }
        const known = await repositories.characters.listAll();
        const plan = planRosterImport(known, roster);
        if (looksIncomplete(plan, known.filter((character) => character.inGuild).length)) {
          return { kind: "incomplete", departures: plan.left.length };
        }
        await repositories.syncMarks.save(ROSTER_MARK, capturedAt);
        if (isEmptyRosterPlan(plan)) {
          return { kind: "unchanged" };
        }
        return { kind: "imported", summary: await apply(repositories, officer, plan, roster, COMPANION_ROSTER_REASON) };
      });
    },
  };
}
