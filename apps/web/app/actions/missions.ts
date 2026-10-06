"use server";

import { MISSION_TYPES, type MissionType } from "@vxv/server";
import { wallClockToInstant } from "@vxv/server/domain/dateTime";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { runFormAction } from "@/server/formActions";
import { requireMember, requireOfficer } from "@/server/session";

const DAY_MS = 24 * 60 * 60 * 1000;
const isMissionType = (type: string): type is MissionType => (MISSION_TYPES as readonly string[]).includes(type);

export async function createMission(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  let missionId: string | undefined;
  const state = await runFormAction(async () => {
    const application = getApplication();
    const type = String(form.get("type") ?? "");
    const startsAt = wallClockToInstant(String(form.get("startsAt") ?? ""));
    missionId = await application.missions.create(
      officer,
      {
        type: isMissionType(type) ? type : ("" as MissionType),
        title: String(form.get("title") ?? ""),
        reward: Number(form.get("reward")),
        startsAt,
        endsAt: new Date(startsAt.getTime() + Number(form.get("days")) * DAY_MS),
      },
      String(form.get("reason") ?? ""),
    );
    await application.missionAnnouncements.announceQuietly(missionId);
    return "Mission publiée.";
  }, ["/", "/quetes", "/journal"]);
  if (missionId !== undefined) {
    redirect(`/quetes/${missionId}`);
  }
  return state;
}

/** An officer validates the result of an ended mission. */
export async function closeMission(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  const missionId = String(form.get("missionId") ?? "");
  return runFormAction(async () => {
    const application = getApplication();
    await application.missions.close(officer, missionId, String(form.get("reason") ?? ""));
    await application.missionAnnouncements.announceQuietly(missionId);
    return "Résultat validé : le trésorier verse les récompenses.";
  }, ["/", "/quetes", `/quetes/${missionId}`, "/journal"]);
}

/** The treasurer hands a reward over. */
export async function payReward(_previous: ActionState, form: FormData): Promise<ActionState> {
  const treasurer = await requireMember();
  const missionId = String(form.get("missionId") ?? "");
  return runFormAction(async () => {
    await getApplication().missions.markRewardPaid(treasurer, missionId, Number(form.get("rank")));
    return "Récompense notée versée.";
  }, ["/quetes", `/quetes/${missionId}`, "/journal"]);
}
