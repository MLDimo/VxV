import { fullName } from "../domain/characters.ts";
import { EVENT_LISTED_AFTER_START_MS, type RaidEvent } from "../domain/events.ts";
import type { RaidLogImportRecord } from "../domain/journal.ts";
import type { Member } from "../domain/members.ts";
import { canManageRaids } from "../domain/permissions.ts";
import { isMoreComplete, parseRaidLog, planRaidLogImport, type RaidLog } from "../domain/raidLog.ts";
import { buildRaidRecap, type RaidRecap } from "../domain/raidRecap.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { Clock, RaidAnnouncer, Repositories, UnitOfWork } from "./ports.ts";

export type RaidLogImportSummary = Omit<RaidLogImportRecord, "raids" | "eventStartsAt">;

/** Journal reason of the logs the officers' companions send. */
export const COMPANION_LOG_REASON = "Journal du raid envoyé par le compagnon";

const OTHER_EVENT = "Ce journal est celui d'un autre événement : exportez celui de cet événement depuis l'addon.";
const UNKNOWN_EVENT = "Cet événement n'existe pas.";

/** What a log brought to the website. */
interface Recorded {
  event: RaidEvent;
  summary: RaidLogImportSummary;
  /** Presences and gives the website did not know before this log. */
  news: number;
}

/** The names of the event's bosses and items, for the recap and the journal. */
async function raidNames(repositories: Repositories, event: RaidEvent) {
  const raidIds = event.raids.map((raid) => raid.id);
  const [bosses, loot] = await Promise.all([
    repositories.raids.listBosses(raidIds),
    repositories.bossLoot.listForRaids(raidIds),
  ]);
  return {
    bosses: new Map(bosses.map((boss) => [boss.encounterId, boss.name])),
    items: new Map(loot.map((item) => [item.itemId, item.name])),
  };
}

/**
 * Adds the players present and the items given that the website does not know yet (an import adds only what is
 * new), keeps the most complete record of the raid for its recap, and journals the import with each loot council
 * give: always for an officer's import, only when something is new for a companion's.
 */
async function record(
  repositories: Repositories,
  officer: Member,
  log: RaidLog,
  text: string,
  { reason, journalAlways, now }: { reason: string; journalAlways: boolean; now: Date },
): Promise<Recorded> {
  const event = await repositories.events.findById(log.eventId);
  if (event === undefined) {
    throw new ValidationError(UNKNOWN_EVENT);
  }
  const [characters, names, kept] = await Promise.all([
    repositories.characters.listAll(),
    raidNames(repositories, event),
    repositories.raidLogs.find(event.id),
  ]);
  const plan = planRaidLogImport(log, {
    characters,
    encounterIds: new Set(names.bosses.keys()),
    itemIds: new Set(names.items.keys()),
  });
  const newlyPresent = await repositories.raidRecords.recordAttendance(event.id, plan.presentIds);
  const added = await repositories.raidRecords.addLoots(event.id, plan.loots);
  if (isMoreComplete(text, kept)) {
    await repositories.raidLogs.save(event.id, text, now);
  }
  const summary: RaidLogImportSummary = {
    kills: log.kills.length,
    present: plan.presentIds.length,
    loots: added.length,
    unknownCharacters: plan.unknownCharacters,
    unknownLoots: plan.unknownLoots,
  };
  const news = newlyPresent + added.length;
  if (journalAlways || news > 0) {
    const where = { raids: event.raids.map((raid) => raid.name), eventStartsAt: event.startsAt.toISOString() };
    await repositories.journal.record({
      actorId: officer.id,
      action: "raid.import",
      entity: "raid",
      entityId: event.id,
      before: null,
      after: { ...where, ...summary },
      reason,
    });
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
          itemName: names.items.get(give.itemId) ?? String(give.itemId),
          characterName: characterNames.get(give.characterId) ?? give.characterId,
        },
        reason,
      });
    }
  }
  return { event, summary, news };
}

export function createRaidLogs({
  unitOfWork,
  announcer,
  clock,
}: {
  unitOfWork: UnitOfWork;
  announcer: RaidAnnouncer;
  clock: Clock;
}) {
  /** Publishes the recap once; Discord being down never fails the caller, the next attempt retries. */
  async function publishRecap(eventId: string, recap: RaidRecap): Promise<boolean> {
    try {
      await announcer.recap(recap);
      await unitOfWork.run(({ events }) => events.markRecapPosted(eventId, clock()));
      return true;
    } catch (error) {
      console.error("Discord raid recap failed", error);
      return false;
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
        const recorded = await record(repositories, officer, log, text, {
          reason: motive,
          journalAlways: true,
          now: clock(),
        });
        const posted = await repositories.events.isRecapPosted(eventId);
        const names = await raidNames(repositories, recorded.event);
        return { summary: recorded.summary, recap: posted ? undefined : buildRaidRecap(recorded.event, log, names) };
      });
      if (recap !== undefined) {
        await publishRecap(eventId, recap);
      }
      return summary;
    },

    /**
     * The log an officer's companion sends after a /reload or a logout (P7.4), during the raid as after it. The same
     * raid comes from several officers: only what is new is added and journaled. The recap waits for the end of
     * the raid (publishDueRecaps).
     */
    async receiveFromCompanion(
      officer: Member,
      text: string,
    ): Promise<{ summary: RaidLogImportSummary; news: number }> {
      if (!canManageRaids(officer.roles)) {
        throw new ForbiddenError();
      }
      const log = parseRaidLog(text);
      return unitOfWork.run(async (repositories) => {
        const { summary, news } = await record(repositories, officer, log, text, {
          reason: COMPANION_LOG_REASON,
          journalAlways: false,
          now: clock(),
        });
        return { summary, news };
      });
    },

    /**
     * Publishes on Discord the recap of every raid over (its event no longer listed) whose log came from the
     * companions and whose recap is not out yet. Returns how many were published.
     */
    async publishDueRecaps(): Promise<number> {
      const startedBefore = new Date(clock().getTime() - EVENT_LISTED_AFTER_START_MS);
      const due = await unitOfWork.run(async (repositories) => {
        const unannounced = await repositories.raidLogs.listUnannounced(startedBefore);
        return Promise.all(
          unannounced.map(async ({ event, content }) => ({
            event,
            recap: buildRaidRecap(event, parseRaidLog(content), await raidNames(repositories, event)),
          })),
        );
      });
      let published = 0;
      for (const { event, recap } of due) {
        published += (await publishRecap(event.id, recap)) ? 1 : 0;
      }
      return published;
    },
  };
}
