import { fullName } from "../domain/characters.ts";
import type { RaidLogImportRecord } from "../domain/journal.ts";
import type { Member } from "../domain/members.ts";
import { parseRaidLog, planRaidLogImport } from "../domain/raidLog.ts";
import { buildRaidRecap, type RaidRecap } from "../domain/raidRecap.ts";
import { ValidationError } from "./errors.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { Clock, RaidAnnouncer, UnitOfWork } from "./ports.ts";

export type RaidLogImportSummary = Omit<RaidLogImportRecord, "raids" | "eventStartsAt">;

const OTHER_EVENT = "Ce journal est celui d'un autre événement : exportez celui de cet événement depuis l'addon.";

export function createRaidLogs({
  unitOfWork,
  announcer,
  clock,
}: {
  unitOfWork: UnitOfWork;
  announcer: RaidAnnouncer;
  clock: Clock;
}) {
  /** Publishes the recap the first time; Discord being down never fails the import, the next one retries. */
  async function publishRecap(eventId: string, recap: RaidRecap): Promise<void> {
    try {
      await announcer.recap(recap);
      await unitOfWork.run(({ events }) => events.markRecapPosted(eventId, clock()));
    } catch (error) {
      console.error("Discord raid recap failed", error);
    }
  }

  return {
    /**
     * An officer imports the raid's log exported by the addon: the players present and the items given are added
     * (a new import adds only what is new), each loot council give is journaled, and the recap goes to Discord.
     */
    async importLog(officer: Member, eventId: string, text: string, reason: string): Promise<RaidLogImportSummary> {
      const motive = checkOfficerAction(officer, reason);
      const log = parseRaidLog(text);
      if (log.eventId !== eventId) {
        throw new ValidationError(OTHER_EVENT);
      }
      const { summary, recap } = await unitOfWork.run(async (repositories) => {
        const event = await repositories.events.findById(eventId);
        if (event === undefined) {
          throw new ValidationError("Cet événement n'existe pas.");
        }
        const raidIds = event.raids.map((raid) => raid.id);
        const [characters, bosses, loot, recapPosted] = await Promise.all([
          repositories.characters.listAll(),
          repositories.raids.listBosses(raidIds),
          repositories.bossLoot.listForRaids(raidIds),
          repositories.events.isRecapPosted(event.id),
        ]);
        const plan = planRaidLogImport(log, {
          characters,
          encounterIds: new Set(bosses.map((boss) => boss.encounterId)),
          itemIds: new Set(loot.map((item) => item.itemId)),
        });
        await repositories.raidRecords.recordAttendance(event.id, plan.presentIds);
        const added = await repositories.raidRecords.addLoots(event.id, plan.loots);
        const where = { raids: event.raids.map((raid) => raid.name), eventStartsAt: event.startsAt.toISOString() };
        const imported: RaidLogImportSummary = {
          kills: log.kills.length,
          present: plan.presentIds.length,
          loots: added.length,
          unknownCharacters: plan.unknownCharacters,
          unknownLoots: plan.unknownLoots,
        };
        await repositories.journal.record({
          actorId: officer.id,
          action: "raid.import",
          entity: "raid",
          entityId: event.id,
          before: null,
          after: { ...where, ...imported },
          reason: motive,
        });
        const itemNames = new Map(loot.map((item) => [item.itemId, item.name]));
        const characterNames = new Map(characters.map((character) => [character.id, fullName(character)]));
        for (const give of added.filter((candidate) => candidate.method === "loot_council")) {
          await repositories.journal.record({
            actorId: officer.id,
            action: "loot.council",
            entity: "loot",
            entityId: `${event.id}/${String(give.itemId)}`,
            before: null,
            after: {
              ...where,
              itemName: itemNames.get(give.itemId) ?? String(give.itemId),
              characterName: characterNames.get(give.characterId) ?? give.characterId,
            },
            reason: motive,
          });
        }
        const bossNames = new Map(bosses.map((boss) => [boss.encounterId, boss.name]));
        return {
          summary: imported,
          recap: recapPosted ? undefined : buildRaidRecap(event, log, { bosses: bossNames, items: itemNames }),
        };
      });
      if (recap !== undefined) {
        await publishRecap(eventId, recap);
      }
      return summary;
    },
  };
}
