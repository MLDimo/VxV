import { isOpen } from "../domain/bets.ts";
import { createMessageAnnouncements } from "./messageAnnouncements.ts";
import type { Clock, UnitOfWork } from "./ports.ts";
import type { BetAnnouncer } from "./discordPorts.ts";

/** Each bet's message on Discord, with its pool and odds. */
export function createBetAnnouncements({
  unitOfWork,
  announcer,
  clock,
}: {
  unitOfWork: UnitOfWork;
  announcer: BetAnnouncer;
  clock: Clock;
}) {
  return createMessageAnnouncements({
    label: "bet",
    announcer,
    store: {
      load: (betId) =>
        unitOfWork.run(async ({ bets, stakes }) => {
          const bet = await bets.findById(betId);
          return (
            bet && {
              item: { bet, stakes: await stakes.listByBet(bet.id), open: isOpen(bet, clock()) },
              message: bet.discordMessage,
            }
          );
        }),
      save: (betId, message) => unitOfWork.run(({ bets }) => bets.setDiscordMessage(betId, message)),
    },
  });
}
