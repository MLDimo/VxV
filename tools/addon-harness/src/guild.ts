import { startCore, type CoreStart } from "./core.ts";

interface SentMessage {
  prefix: string;
  channel: string;
  target?: string;
  hex: string;
}

/** Several players, each on their own client with VXV_Core, and the server between them. */
export function startGuild(names: readonly string[], options: Omit<CoreStart, "playerName"> = {}) {
  const players = names.map((name) => ({ name, ...startCore({ ...options, playerName: name }) }));

  const recipients = (sender: string, message: SentMessage) => {
    switch (message.channel) {
      case "WHISPER":
        return players.filter((player) => player.name === message.target);
      case "GUILD":
        // The guild channel does not send a message back to its sender (measured in phase 0).
        return players.filter((player) => player.name !== sender);
      default:
        return players;
    }
  };

  return {
    players,
    player(name: string) {
      const found = players.find((player) => player.name === name);
      if (found === undefined) {
        throw new Error(`${name} is not in the guild`);
      }
      return found;
    },
    /** Carries every message sent until nobody answers anymore; returns how many were carried. */
    deliver(): number {
      let carried = 0;
      for (let moved = -1; moved !== 0;) {
        moved = 0;
        for (const sender of players) {
          const sent = sender.client("return TakeSentMessages()");
          for (const message of Array.isArray(sent) ? (sent as unknown as SentMessage[]) : []) {
            for (const recipient of recipients(sender.name, message)) {
              recipient.client(
                `Fire("CHAT_MSG_ADDON", ${JSON.stringify(message.prefix)}, FromHex("${message.hex}"), ` +
                  `${JSON.stringify(message.channel)}, ${JSON.stringify(sender.name)})`,
              );
            }
            moved += 1;
          }
        }
        carried += moved;
      }
      return carried;
    },
  };
}
