import { healingReceivedInRaid, parseBossFight } from "../domain/bossFights.ts";
import { fullName } from "../domain/characters.ts";
import type { TitleGiveRecord } from "../domain/journal.ts";
import type { Member } from "../domain/members.ts";
import { parseRaidLog, type RaidLog } from "../domain/raidLog.ts";
import { awardTitles, OFFICER_TITLES, TITLES, titleWeek, type Tally, type TitleFacts } from "../domain/titles.ts";
import { rankedDeathroll } from "./debts.ts";
import { ValidationError } from "./errors.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { Clock, Repositories, TitleHolder, UnitOfWork } from "./ports.ts";
import type { GuildGateway, TitleAnnouncer } from "./discordPorts.ts";

/** Each title is a Discord role of this name, held by the week's holder. */
export function titleRole(titleName: string): string {
  return `◆ ${titleName}`;
}

/** How many weeks the website shows. */
const TITLE_WEEKS_SHOWN = 8;

export interface TitleWeek {
  week: string;
  holders: TitleHolder[];
}

/** What the titles are computed from: the season's data (since always without a season). */
async function titleFacts(repositories: Repositories): Promise<TitleFacts> {
  const since = (await repositories.seasons.current())?.startedAt;
  const inSeason = (at: Date) => since === undefined || at >= since;
  const bets = (await repositories.stakes.listRanked()).filter(
    (stake) => stake.outcome !== "refunded" && inSeason(stake.endedAt),
  );
  // The missions validated, by their end: the last one's winner is Numéro UNO.
  const last = (await repositories.missions.listClosed()).at(-1);
  const winner =
    last === undefined
      ? undefined
      : (await repositories.missionRewards.listForMissions([last.id])).find((reward) => reward.rank === 1);
  const byName = new Map(
    (await repositories.characters.listAll()).flatMap((character) =>
      character.memberId === undefined ? [] : [[fullName(character), character.memberId] as const],
    ),
  );
  // The raids' logs, read once: each line of a character counts for their member.
  const logs = (await repositories.raidLogs.listStartedSince(since)).map(({ startsAt, content }) => ({
    at: startsAt,
    log: parseRaidLog(content),
  }));
  // The bosses killed the companions read in the combat logs: the healing received (Princesse).
  const fights = (await repositories.bossFights.listEndedSince(since)).map((stored) => parseBossFight(stored.content));
  const tally = (lines: (log: RaidLog) => readonly { name: string; amount: number }[]): Tally =>
    logs.flatMap(({ at, log }) =>
      lines(log).flatMap(({ name, amount }) => {
        const memberId = byName.get(name);
        return memberId === undefined ? [] : [{ memberId, amount, at }];
      }),
    );
  return {
    bets: bets.map((stake) => ({
      memberId: stake.memberId,
      amount: stake.amount,
      gain: stake.gain,
      endedAt: stake.endedAt,
    })),
    lastMissionWinner:
      winner === undefined || last === undefined ? undefined : { memberId: winner.memberId, at: last.endsAt },
    loots: await repositories.lootHistory.listReceivedSince(since),
    deaths: tally((log) => log.deaths.map(({ name, count }) => ({ name, amount: count }))),
    damage: tally((log) => log.meter.map(({ name, damage }) => ({ name, amount: damage }))),
    healing: tally((log) => log.meter.map(({ name, healing }) => ({ name, amount: healing }))),
    healingReceived: tally((log) => healingReceivedInRaid(log, fights)),
    raised: tally((log) => log.raised.map(({ name, count }) => ({ name, amount: count }))),
    deathrolls: (await repositories.deathrolls.listAll()).flatMap((game) => {
      const ranked = rankedDeathroll(game);
      return ranked === undefined || !inSeason(ranked.endedAt) ? [] : [ranked];
    }),
    donations: (await repositories.cash.listAll()).flatMap((movement) =>
      movement.kind === "donation" && movement.memberId !== undefined && inSeason(movement.occurredAt)
        ? [{ memberId: movement.memberId, amount: movement.amount, at: movement.occurredAt }]
        : [],
    ),
  };
}

/** The holders grouped by week, the latest first. */
function byWeek(holders: readonly TitleHolder[]): TitleWeek[] {
  const weeks: TitleWeek[] = [];
  for (const holder of holders) {
    const current = weeks.at(-1);
    if (current?.week === holder.week) {
      current.holders.push(holder);
    } else {
      weeks.push({ week: holder.week, holders: [holder] });
    }
  }
  return weeks;
}

/** The guild's titles (P13): given each Wednesday, with their Discord roles and announcement. */
export function createTitles({
  unitOfWork,
  clock,
  guild,
  announcer,
}: {
  unitOfWork: UnitOfWork;
  clock: Clock;
  guild: GuildGateway;
  announcer: TitleAnnouncer;
}) {
  /** The Discord roles follow the holders: taken from the former, given to the new; never failing the titles. */
  async function updateRoles(previous: readonly TitleHolder[], current: readonly TitleHolder[]): Promise<void> {
    for (const title of TITLES) {
      const before = previous.find((holder) => holder.titleId === title.id);
      const after = current.find((holder) => holder.titleId === title.id);
      if (before?.memberId === after?.memberId) {
        continue;
      }
      try {
        if (before !== undefined) {
          await guild.removeRole(before.discordId, titleRole(title.name));
        }
        if (after !== undefined) {
          await guild.addRole(after.discordId, titleRole(title.name));
        }
      } catch (error) {
        console.error("Discord title role update failed", error);
      }
    }
  }

  return {
    /**
     * The week's reassignment (P13.2), each Wednesday at reset: the titles go to the members ahead over the season,
     * the history stays, the Discord roles follow and the new holders are announced. Once a week: false when the
     * week's titles were given already.
     */
    async reassign(): Promise<boolean> {
      const now = clock();
      const week = titleWeek(now);
      const outcome = await unitOfWork.run(async (repositories) => {
        const [latest] = byWeek(await repositories.titles.listLatestWeeks(1));
        if (latest?.week === week) {
          return undefined;
        }
        await repositories.titles.saveWeek(week, awardTitles(await titleFacts(repositories)), now);
        const [current] = byWeek(await repositories.titles.listLatestWeeks(1));
        return { previous: latest?.holders ?? [], current: current?.week === week ? current.holders : [] };
      });
      if (outcome === undefined) {
        return false;
      }
      await updateRoles(outcome.previous, outcome.current);
      try {
        await announcer.announce({
          week,
          holders: TITLES.map((title) => {
            const holder = outcome.current.find((candidate) => candidate.titleId === title.id);
            return { title: title.name, rule: title.rule, holder: holder?.memberName, score: holder?.score ?? 0 };
          }),
        });
      } catch (error) {
        console.error("Discord titles announcement failed", error);
      }
      return true;
    },

    /**
     * An officer gives a title the game does not measure (Princesse) to a member, for the week the titles show (the
     * week to come before the first reassignment): like the others, it goes to nobody at the next Wednesday's. The
     * Discord role follows at once.
     */
    async give(officer: Member, titleId: string, memberId: string, reason: string): Promise<void> {
      const motive = checkOfficerAction(officer, reason);
      const title = OFFICER_TITLES.find((candidate) => candidate.id === titleId);
      if (title === undefined) {
        throw new ValidationError("Ce titre se calcule chaque mercredi : seuls les titres des officiers se donnent.");
      }
      const now = clock();
      const change = await unitOfWork.run(async (repositories) => {
        if ((await repositories.members.findById(memberId)) === undefined) {
          throw new ValidationError("Ce membre n'existe pas.");
        }
        const [latest] = byWeek(await repositories.titles.listLatestWeeks(1));
        const week = latest?.week ?? titleWeek(now);
        const before = latest?.holders.find((holder) => holder.titleId === title.id);
        if (before?.memberId === memberId) {
          throw new ValidationError(`${before.memberName} détient déjà ce titre cette semaine.`);
        }
        await repositories.titles.give(week, title.id, memberId, now);
        const [current] = byWeek(await repositories.titles.listLatestWeeks(1));
        const after = current?.holders.find((holder) => holder.titleId === title.id);
        const record: TitleGiveRecord = { title: title.name, week, holder: after?.memberName ?? "" };
        await repositories.journal.record({
          actorId: officer.id,
          action: "title.give",
          entity: "title",
          entityId: `${week}/${title.id}`,
          before: before === undefined ? null : { holder: before.memberName },
          after: record,
          reason: motive,
        });
        return { before, after };
      });
      await updateRoles(
        change.before === undefined ? [] : [change.before],
        change.after === undefined ? [] : [change.after],
      );
    },

    /** The latest weeks' holders, the latest first, for the website and the addon. */
    async weeks(count = TITLE_WEEKS_SHOWN): Promise<TitleWeek[]> {
      return byWeek(await unitOfWork.run(({ titles }) => titles.listLatestWeeks(count)));
    },
  };
}

export type Titles = ReturnType<typeof createTitles>;
