import { fullName } from "../domain/characters.ts";
import type { MissionCloseRecord, MissionCreationRecord } from "../domain/journal.ts";
import { formatPlace } from "../domain/labels.ts";
import type { Member } from "../domain/members.ts";
import {
  hallOfFame,
  MISSION_TYPES,
  missionRewards,
  missionScores,
  missionStatus,
  newMissionRefusal,
  type HallOfFameEntry,
  type Mission,
  type MissionRewardRecord,
  type MissionScore,
  type MissionStatus,
  type MissionType,
  type NewMission,
} from "../domain/missions.ts";
import { canManageRaids } from "../domain/permissions.ts";
import { ValidationError } from "./errors.ts";
import { checkOfficerAction, checkTreasurerAction } from "./officerActions.ts";
import type { Clock, NewCounterReading, Repositories, UnitOfWork } from "./ports.ts";

/** How many missions the website lists: the running and upcoming ones, then the latest ended. */
const MISSIONS_LISTED = 20;

const UNKNOWN_MISSION = "Cette mission n'existe pas.";

/** A mission as everybody sees it: where it stands, its scores, and its rewards once closed. */
export interface MissionView {
  mission: Mission;
  status: MissionStatus;
  scores: MissionScore[];
  rewards: MissionRewardRecord[];
}

/** A counter reading as an addon sends it: its character by name. */
export interface GameCounterReading {
  name: string;
  type: string;
  value: number;
  at: Date;
}

const isMissionType = (type: string): type is MissionType => (MISSION_TYPES as readonly string[]).includes(type);

export function createMissions({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  async function views(repositories: Repositories, missions: readonly Mission[]): Promise<MissionView[]> {
    const now = clock();
    const rewards = await repositories.missionRewards.listForMissions(missions.map((mission) => mission.id));
    const result: MissionView[] = [];
    for (const mission of missions) {
      const readings = await repositories.counterReadings.listUntil(mission.type, mission.endsAt);
      result.push({
        mission,
        status: missionStatus(mission, now),
        scores: missionScores(mission, readings),
        rewards: rewards.filter((reward) => reward.missionId === mission.id),
      });
    }
    return result;
  }

  async function requireView(repositories: Repositories, missionId: string): Promise<MissionView> {
    const mission = await repositories.missions.findById(missionId);
    if (mission === undefined) {
      throw new ValidationError(UNKNOWN_MISSION);
    }
    const [view] = await views(repositories, [mission]);
    if (view === undefined) {
      throw new ValidationError(UNKNOWN_MISSION);
    }
    return view;
  }

  return {
    /** An officer publishes a mission: its type, title, reward and span. */
    async create(officer: Member, input: NewMission, reason: string): Promise<string> {
      const motive = checkOfficerAction(officer, reason);
      const mission: NewMission = { ...input, title: input.title.trim() };
      const now = clock();
      const refusal = newMissionRefusal(mission, now);
      if (refusal !== undefined) {
        throw new ValidationError(refusal);
      }
      return unitOfWork.run(async ({ missions, journal }) => {
        const missionId = await missions.create(mission, officer.id, now);
        const after: MissionCreationRecord = {
          title: mission.title,
          type: mission.type,
          reward: mission.reward,
          startsAt: mission.startsAt.toISOString(),
          endsAt: mission.endsAt.toISOString(),
        };
        await journal.record({
          actorId: officer.id,
          action: "mission.create",
          entity: "mission",
          entityId: missionId,
          before: null,
          after,
          reason: motive,
        });
        return missionId;
      });
    },

    /** The running and upcoming missions, soonest ending first, then the ended ones, latest first. */
    async list(): Promise<MissionView[]> {
      const all = await unitOfWork.run(async (repositories) =>
        views(repositories, await repositories.missions.listRecent(MISSIONS_LISTED)),
      );
      const current = all.filter((view) => view.status === "running" || view.status === "upcoming").reverse();
      return [...current, ...all.filter((view) => view.status === "ended" || view.status === "closed")];
    },

    find(missionId: string): Promise<MissionView | undefined> {
      return unitOfWork.run(async (repositories) =>
        (await repositories.missions.findById(missionId)) === undefined
          ? undefined
          : requireView(repositories, missionId),
      );
    },

    /**
     * The counters an addon read (P12.4), as a companion sends them: for the sender's own characters, and for an
     * officer those relayed from other players. Unknown characters and counters are left aside. Returns how many
     * readings were new.
     */
    async recordReadings(sender: Member, readings: readonly GameCounterReading[]): Promise<number> {
      return unitOfWork.run(async ({ characters, counterReadings }) => {
        const byName = new Map((await characters.listAll()).map((character) => [fullName(character), character]));
        const relay = canManageRaids(sender.roles);
        const kept = readings.flatMap((reading): NewCounterReading[] => {
          const character = byName.get(reading.name);
          const allowed = character?.memberId !== undefined && (relay || character.memberId === sender.id);
          return allowed && isMissionType(reading.type) && Number.isInteger(reading.value) && reading.value >= 0
            ? [{ characterId: character.id, type: reading.type, value: reading.value, readAt: reading.at }]
            : [];
        });
        return counterReadings.add(kept, sender.id);
      });
    },

    /** An officer validates the result of an ended mission: the first three's rewards, recorded in the journal. */
    async close(officer: Member, missionId: string, reason: string): Promise<void> {
      const motive = checkOfficerAction(officer, reason);
      await unitOfWork.run(async (repositories) => {
        const { mission, status, scores } = await requireView(repositories, missionId);
        if (status !== "ended") {
          throw new ValidationError(
            status === "closed" ? "Le résultat de cette mission est déjà validé." : "Cette mission n'est pas finie.",
          );
        }
        const rewards = missionRewards(scores, mission.reward);
        await repositories.missionRewards.save(mission.id, rewards);
        await repositories.missions.close(mission.id, officer.id, clock());
        const after: MissionCloseRecord = {
          title: mission.title,
          reward: mission.reward,
          winners: rewards.map((reward) => ({
            rank: reward.rank,
            name: scores.find((score) => score.memberId === reward.memberId)?.memberName ?? "",
            amount: reward.amount,
          })),
        };
        await repositories.journal.record({
          actorId: officer.id,
          action: "mission.close",
          entity: "mission",
          entityId: mission.id,
          before: null,
          after,
          reason: motive,
        });
      });
    },

    /** The treasurer hands a reward over: it leaves the guild's cash. */
    async markRewardPaid(treasurer: Member, missionId: string, rank: number): Promise<void> {
      checkTreasurerAction(treasurer);
      await unitOfWork.run(async (repositories) => {
        const { mission, rewards } = await requireView(repositories, missionId);
        const reward = rewards.find((candidate) => candidate.rank === rank);
        if (reward === undefined) {
          throw new ValidationError("Cette récompense n'existe pas.");
        }
        if (reward.paidAt !== undefined) {
          throw new ValidationError("Cette récompense est déjà versée.");
        }
        const now = clock();
        await repositories.missionRewards.markPaid(mission.id, rank, treasurer.id, now);
        if (reward.amount > 0) {
          await repositories.cash.record(
            {
              kind: "reward",
              amount: -reward.amount,
              label: `Mission « ${mission.title} » : récompense du ${formatPlace(rank)} (${reward.memberName})`,
              reason: "Récompense de mission versée",
              recordedBy: treasurer.id,
              betId: undefined,
              memberId: undefined,
              missionId: mission.id,
            },
            now,
          );
        }
      });
    },

    /** The hall of fame over the closed missions (P12.7). */
    hallOfFame(): Promise<HallOfFameEntry[]> {
      return unitOfWork.run(async (repositories) =>
        hallOfFame(await views(repositories, await repositories.missions.listClosed())),
      );
    },
  };
}

export type Missions = ReturnType<typeof createMissions>;
