import { avatarName } from "@vxv/design";
import { formatAddonRanking, type AddonRankingMember } from "../domain/addonRanking.ts";
import { addonReaders } from "./addonReaders.ts";
import type { MemberLook, UnitOfWork, Clock } from "./ports.ts";
import type { createRanking } from "./ranking.ts";

/** Ranking's boards as the companion hands them to the addon (§7.5): every category over every period. */
export function createAddonRanking({
  unitOfWork,
  clock,
  ranking,
}: {
  unitOfWork: UnitOfWork;
  clock: Clock;
  ranking: Pick<ReturnType<typeof createRanking>, "all">;
}) {
  return {
    /** VXV-RANKING text for the companion of any member: an officer's addon passes it on to the guild. */
    async exportRanking(): Promise<string> {
      const views = await ranking.all();
      const members = new Map<string, AddonRankingMember>();
      const add = (look: MemberLook, title: string | undefined) => {
        members.set(look.memberId, {
          memberId: look.memberId,
          name: look.name,
          characterClass: look.characterClass,
          avatar: look.characterClass === undefined ? undefined : avatarName(look.characterClass, look.race, look.sex),
          title: title ?? members.get(look.memberId)?.title,
        });
      };
      for (const view of views) {
        view.lines.forEach((line) => add(line, line.title));
        view.records.forEach((record) => add(record.member, undefined));
      }
      return unitOfWork.run(async (repositories) =>
        formatAddonRanking({
          ...(await addonReaders(repositories)),
          seasonNumber: views[0]?.season?.number,
          members: [...members.values()],
          boards: views.map((view) => ({
            category: view.category,
            period: view.period,
            metric: view.metric,
            unit: view.unit,
            rows: view.lines,
            records: view.records.map((record) => ({ ...record, memberId: record.member.memberId })),
          })),
          exportedAt: clock(),
        }),
      );
    },
  };
}
