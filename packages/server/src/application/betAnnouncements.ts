import { isOpen } from "../domain/bets.ts";
import type { BetAnnouncer, Clock, UnitOfWork } from "./ports.ts";

export function createBetAnnouncements({
  unitOfWork,
  announcer,
  clock,
}: {
  unitOfWork: UnitOfWork;
  announcer: BetAnnouncer;
  clock: Clock;
}) {
  /** Publishes the bet's message on Discord the first time (or again if deleted), then updates it. */
  async function announce(betId: string): Promise<void> {
    const announced = await unitOfWork.run(async ({ bets, stakes }) => {
      const bet = await bets.findById(betId);
      return bet && { bet, stakes: await stakes.listByBet(bet.id), open: isOpen(bet, clock()) };
    });
    if (announced === undefined) {
      return;
    }
    const { discordMessage } = announced.bet;
    if (discordMessage !== undefined && (await announcer.update(discordMessage, announced))) {
      return;
    }
    const published = await announcer.publish(announced);
    await unitOfWork.run(({ bets }) => bets.setDiscordMessage(betId, published));
  }

  return {
    announce,

    /**
     * The same, after a bet or a stake is saved: never fails, whatever Discord answers. False when Discord could
     * not be reached; the next stake publishes or updates the message.
     */
    async announceQuietly(betId: string): Promise<boolean> {
      try {
        await announce(betId);
        return true;
      } catch (error) {
        console.error("Discord bet announcement failed", error);
        return false;
      }
    },
  };
}
