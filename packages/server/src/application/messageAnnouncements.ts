import type { DiscordMessage } from "../domain/bets.ts";
import type { MessageAnnouncer } from "./ports.ts";

/** How an item is found, with its message on Discord, and how its new message is kept. */
export interface AnnouncementStore<Item> {
  load(id: string): Promise<{ item: Item; message: DiscordMessage | undefined } | undefined>;
  save(id: string, message: DiscordMessage): Promise<void>;
}

/** An item's message on Discord (a bet, a mission): published the first time, or again if deleted, then updated. */
export function createMessageAnnouncements<Item>({
  store,
  announcer,
  label,
}: {
  store: AnnouncementStore<Item>;
  announcer: MessageAnnouncer<Item>;
  /** What the item is, for the logs: "bet", "mission". */
  label: string;
}) {
  async function announce(id: string): Promise<void> {
    const loaded = await store.load(id);
    if (loaded === undefined) {
      return;
    }
    if (loaded.message !== undefined && (await announcer.update(loaded.message, loaded.item))) {
      return;
    }
    await store.save(id, await announcer.publish(loaded.item));
  }

  return {
    announce,

    /**
     * The same, after the item changed: never fails, whatever Discord answers. False when Discord could not be
     * reached; the next change publishes or updates the message.
     */
    async announceQuietly(id: string): Promise<boolean> {
      try {
        await announce(id);
        return true;
      } catch (error) {
        console.error(`Discord ${label} announcement failed`, error);
        return false;
      }
    },
  };
}
