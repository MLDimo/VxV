import { duelStatus } from "../domain/duels.ts";
import type { DuelAnnouncer } from "./discordPorts.ts";
import { createMessageAnnouncements } from "./messageAnnouncements.ts";
import type { UnitOfWork } from "./ports.ts";

/** Each duel's message on Discord, in the PvP channel: the challenge, then where it stands. */
export function createDuelAnnouncements({
  unitOfWork,
  announcer,
}: {
  unitOfWork: UnitOfWork;
  announcer: DuelAnnouncer;
}) {
  return createMessageAnnouncements({
    label: "duel",
    announcer,
    store: {
      load: (duelId) =>
        unitOfWork.run(async ({ duels, members }) => {
          const duel = await duels.findById(duelId);
          if (duel === undefined) {
            return undefined;
          }
          const looks = await members.listLooks();
          const nameOf = (memberId: string | undefined) => looks.find((look) => look.memberId === memberId)?.name;
          return {
            item: {
              duel,
              status: duelStatus(duel),
              challenger: nameOf(duel.challengerId) ?? "",
              opponent: nameOf(duel.opponentId) ?? "",
              opponentDiscordId: (await members.findById(duel.opponentId))?.discordId ?? "",
              winner: nameOf(duel.winnerId),
            },
            message: duel.discordMessage,
          };
        }),
      save: (duelId, message) => unitOfWork.run(({ duels }) => duels.setDiscordMessage(duelId, message)),
    },
  });
}
