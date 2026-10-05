import { describeRaidLogImport, describeRosterImport } from "../domain/journalDescriptions.ts";
import { count } from "../domain/labels.ts";
import type { Member } from "../domain/members.ts";
import { canManageRaids } from "../domain/permissions.ts";
import { TextFormatError } from "../domain/textFormat.ts";
import type { GameCharacter } from "./characters.ts";
import { ApplicationError } from "./errors.ts";
import type { RaidLogImportSummary } from "./raidLogs.ts";
import type { RosterUploadOutcome } from "./roster.ts";

/** What a companion sends after a /reload or a logout: what its player's addon saved for the website (P7.4). */
export interface CompanionUpload {
  /** The guild's roster as VXV-ROSTER text, and when the addon read it. */
  roster: { text: string; capturedAt: Date } | undefined;
  /** Records of raids as VXV-LOG text. */
  raidLogs: readonly string[];
  /** The player's own characters as the game draws them. */
  characters: readonly GameCharacter[];
}

/** What the website made of it, in French, for the companion's window. */
export interface CompanionUploadReport {
  roster: string | undefined;
  raidLogs: string[];
  /** Characters whose appearance was kept. */
  characters: number;
}

const OFFICERS_ONLY = "Réservé aux officiers.";

/** The use cases an upload goes through, each checking the member's rights. */
export interface CompanionUploadDependencies {
  roster: { importFromCompanion(officer: Member, text: string, capturedAt: Date): Promise<RosterUploadOutcome> };
  raidLogs: {
    receiveFromCompanion(officer: Member, text: string): Promise<{ summary: RaidLogImportSummary; news: number }>;
  };
  characters: { recordAppearances(member: Member, seen: readonly GameCharacter[]): Promise<number> };
}

function describeRoster(outcome: RosterUploadOutcome): string {
  switch (outcome.kind) {
    case "imported":
      return `Liste de guilde importée : ${describeRosterImport(outcome.summary)}.`;
    case "unchanged":
      return "Liste de guilde à jour.";
    case "older":
      return "Liste de guilde plus ancienne que la dernière importée : ignorée.";
    case "incomplete":
      return (
        `Liste de guilde incomplète (${count(outcome.departures, "départ")}) : ignorée. ` +
        "Importez-la sur le site si ces départs sont réels."
      );
  }
}

/** A refusal of one part, as its message; the other parts go on. */
async function described(work: () => Promise<string>): Promise<string> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof TextFormatError) {
      return error.problems.join(" ");
    }
    if (error instanceof ApplicationError) {
      return error.message;
    }
    throw error;
  }
}

export function createCompanionUploads({ roster, raidLogs, characters }: CompanionUploadDependencies) {
  return {
    /**
     * Takes what the member's addon saved: their characters' appearance, and for an officer the guild's roster and
     * the raids' records. Several officers send the same data: each use case keeps only what is new.
     */
    async receive(member: Member, upload: CompanionUpload): Promise<CompanionUploadReport> {
      const officer = canManageRaids(member.roles);
      const report: CompanionUploadReport = {
        roster: undefined,
        raidLogs: [],
        characters: await characters.recordAppearances(member, upload.characters),
      };
      const sentRoster = upload.roster;
      if (sentRoster !== undefined) {
        report.roster = officer
          ? await described(async () =>
              describeRoster(await roster.importFromCompanion(member, sentRoster.text, sentRoster.capturedAt)),
            )
          : OFFICERS_ONLY;
      }
      for (const text of upload.raidLogs) {
        report.raidLogs.push(
          officer
            ? await described(async () => {
                const { summary, news } = await raidLogs.receiveFromCompanion(member, text);
                return news > 0
                  ? `Journal du raid importé : ${describeRaidLogImport(summary)}.`
                  : "Journal du raid à jour.";
              })
            : OFFICERS_ONLY,
        );
      }
      return report;
    },
  };
}
