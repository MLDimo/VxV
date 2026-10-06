import type { GameChange, GameChangeOutcome } from "../domain/gameChanges.ts";
import { describeRaidLogImport, describeRosterImport } from "../domain/journalDescriptions.ts";
import { count } from "../domain/labels.ts";
import type { Member } from "../domain/members.ts";
import { canManageRaids } from "../domain/permissions.ts";
import { TextFormatError } from "../domain/textFormat.ts";
import type { GameCharacter } from "./characters.ts";
import type { GameCounterReading } from "./missions.ts";
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
  /** Changes made in game: the player's own, and for an officer those relayed from other players. */
  changes: readonly GameChange[];
  /** Game counters the addon read (P12.4): the player's own, and for an officer those relayed. */
  counters: readonly GameCounterReading[];
  /** Each bundle's texts for the website, by kind ("metiers": a character's professions as VXV-METIERS text). */
  texts: Readonly<Record<string, readonly string[]>>;
}

/** What the website made of it, in French, for the companion's window. */
export interface CompanionUploadReport {
  roster: string | undefined;
  raidLogs: string[];
  /** Characters whose appearance was kept. */
  characters: number;
  /** What became of the changes made in game, if any were sent. */
  changes: string | undefined;
  /** How many counter readings were new, if any were sent. */
  counters: string | undefined;
  /** What became of each bundle's texts (the professions…), shown as they come by any companion since 1.3. */
  texts: string[];
}

const OFFICERS_ONLY = "Réservé aux officiers.";
/** The kind of text the artisans' professions come as (addon/VXV_Artisans). */
export const PROFESSIONS_KIND = "metiers";
/** The kind of text the deathroll games come as (addon/VXV_Deathroll). */
export const DEATHROLL_KIND = "deathroll";

/** The use cases an upload goes through, each checking the member's rights. */
export interface CompanionUploadDependencies {
  roster: { importFromCompanion(officer: Member, text: string, capturedAt: Date): Promise<RosterUploadOutcome> };
  raidLogs: {
    receiveFromCompanion(officer: Member, text: string): Promise<{ summary: RaidLogImportSummary; news: number }>;
  };
  characters: { recordAppearances(member: Member, seen: readonly GameCharacter[]): Promise<number> };
  gameChanges: { receive(sender: Member, changes: readonly GameChange[]): Promise<GameChangeOutcome[]> };
  missions: {
    recordReadings(sender: Member, readings: readonly GameCounterReading[]): Promise<number>;
    list(): Promise<readonly { mission: { id: string }; status: string }[]>;
  };
  /** The running missions' messages on Discord follow their ranking. */
  missionAnnouncements: { announceQuietly(missionId: string): Promise<boolean> };
  artisans: { recordFromGame(sender: Member, texts: readonly string[]): Promise<number> };
  deathrolls: { recordFromGame(sender: Member, texts: readonly string[]): Promise<string[]> };
}

/** "3 changements faits en jeu : 2 acceptés, 1 refusé." */
function describeChanges(outcomes: readonly GameChangeOutcome[]): string {
  const accepted = outcomes.filter((outcome) => outcome.accepted).length;
  const parts = [count(accepted, "accepté"), count(outcomes.length - accepted, "refusé")];
  return `${count(outcomes.length, "changement fait en jeu", "changements faits en jeu")} : ${parts.join(", ")}.`;
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

export function createCompanionUploads({
  roster,
  raidLogs,
  characters,
  gameChanges,
  missions,
  missionAnnouncements,
  artisans,
  deathrolls,
}: CompanionUploadDependencies) {
  /** Keeps the new readings; the running missions' rankings on Discord follow them. */
  async function recordCounters(member: Member, readings: readonly GameCounterReading[]): Promise<string> {
    const added = await missions.recordReadings(member, readings);
    if (added > 0) {
      for (const view of await missions.list()) {
        if (view.status === "running") {
          await missionAnnouncements.announceQuietly(view.mission.id);
        }
      }
    }
    return `${count(added, "nouveau relevé de compteur", "nouveaux relevés de compteurs")}.`;
  }

  return {
    /**
     * Takes what the member's addon saved: their characters' appearance, the changes made in game, and for an officer
     * the guild's roster and the raids' records. Several players send the same data: each use case keeps only what
     * is new.
     */
    async receive(member: Member, upload: CompanionUpload): Promise<CompanionUploadReport> {
      const officer = canManageRaids(member.roles);
      const report: CompanionUploadReport = {
        roster: undefined,
        raidLogs: [],
        characters: await characters.recordAppearances(member, upload.characters),
        changes:
          upload.changes.length === 0 ? undefined : describeChanges(await gameChanges.receive(member, upload.changes)),
        counters: upload.counters.length === 0 ? undefined : await recordCounters(member, upload.counters),
        texts: [],
      };
      const professions = upload.texts[PROFESSIONS_KIND] ?? [];
      if (professions.length > 0) {
        report.texts.push(
          await described(async () => {
            const changed = await artisans.recordFromGame(member, professions);
            return changed > 0 ? `Métiers : ${count(changed, "mis à jour", "mis à jour")}.` : "Métiers à jour.";
          }),
        );
      }
      for (const text of upload.texts[DEATHROLL_KIND] ?? []) {
        report.texts.push(await described(async () => (await deathrolls.recordFromGame(member, [text])).join(" ")));
      }
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
