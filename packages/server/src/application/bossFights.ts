import { parseBossFight, SAME_FIGHT_MS, totalHealing } from "../domain/bossFights.ts";
import type { Member } from "../domain/members.ts";
import type { Clock, UnitOfWork } from "./ports.ts";

/** The bosses killed the companions read in the game's combat log (phase 0, T11): each fight kept once. */
export function createBossFights({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  return {
    /**
     * The bosses killed a member's companion read: a new fight is kept, and a more complete record of a known one (more
     * healing seen: its sender stood closer) takes its place. Returns how many were new or completed.
     */
    async recordFromCompanion(sender: Member, texts: readonly string[]): Promise<number> {
      const records = texts.map((content) => ({ content, fight: parseBossFight(content) }));
      return unitOfWork.run(async ({ bossFights }) => {
        let kept = 0;
        for (const { content, fight } of records) {
          const near = await bossFights.listEndedBetween(
            fight.encounterId,
            new Date(fight.endedAt.getTime() - SAME_FIGHT_MS),
            new Date(fight.endedAt.getTime() + SAME_FIGHT_MS),
          );
          const known = near.toSorted((left, right) => right.totalHealing - left.totalHealing)[0];
          const total = totalHealing(fight);
          if (known === undefined || total > known.totalHealing) {
            await bossFights.save({
              encounterId: fight.encounterId,
              endedAt: fight.endedAt,
              content,
              totalHealing: total,
              sentBy: sender.id,
              receivedAt: clock(),
              replacing: known?.id,
            });
            kept += 1;
          }
        }
        return kept;
      });
    },
  };
}
