import type { Member } from "../domain/members.ts";
import { parseRoster, planRosterImport, summarizeRosterImport, type RosterImportSummary } from "../domain/roster.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { UnitOfWork } from "./ports.ts";

export function createRoster({ unitOfWork }: { unitOfWork: UnitOfWork }) {
  return {
    /**
     * Aligns the guild characters on a roster exported by an officer's addon: new characters are added,
     * classes updated, and characters missing from the roster are marked as having left the guild.
     */
    async importRoster(actor: Member, text: string, reason: string): Promise<RosterImportSummary> {
      const motive = checkOfficerAction(actor, reason);
      const roster = parseRoster(text);
      return unitOfWork.run(async ({ characters, journal }) => {
        const plan = planRosterImport(await characters.listAll(), roster);
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
          reason: motive,
        });
        return summary;
      });
    },
  };
}
