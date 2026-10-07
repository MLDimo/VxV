import type { UnitOfWork } from "./ports.ts";
import type { RaidAnnouncer } from "./discordPorts.ts";

export function createRaidAnnouncements({
  unitOfWork,
  announcer,
}: {
  unitOfWork: UnitOfWork;
  announcer: RaidAnnouncer;
}) {
  /** Publishes the event's sign-up message on Discord the first time (or again if deleted), then updates it. */
  async function announce(eventId: string): Promise<void> {
    const raid = await unitOfWork.run(async ({ events, signups }) => {
      const event = await events.findById(eventId);
      return event && { event, signups: await signups.listByEvent(eventId) };
    });
    if (raid === undefined) {
      return;
    }
    if (raid.event.discordMessageId !== undefined && (await announcer.update(raid.event.discordMessageId, raid))) {
      return;
    }
    const messageId = await announcer.publish(raid);
    await unitOfWork.run(({ events }) => events.setDiscordMessage(eventId, messageId));
  }

  return {
    announce,

    /**
     * The same, after an event or a sign-up is saved: never fails, whatever Discord answers.
     * False when Discord could not be reached; the next change publishes or updates the message.
     */
    async announceQuietly(eventId: string): Promise<boolean> {
      try {
        await announce(eventId);
        return true;
      } catch (error) {
        console.error("Discord raid announcement failed", error);
        return false;
      }
    },
  };
}
