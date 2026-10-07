import type { Bet, DiscordMessage, Stake } from "../domain/bets.ts";
import type { RaidEvent } from "../domain/events.ts";
import type { Mission, MissionScore, MissionStatus } from "../domain/missions.ts";
import type { RaidRecap } from "../domain/raidRecap.ts";
import type { RaidReminder } from "../domain/reminders.ts";
import type { Signup } from "../domain/signups.ts";

/** The application's ports to Discord, the bot's adapters: the guild's server and the channels it announces in. */

/** The guild's Discord server, as the bot acts on it. */
export interface GuildGateway {
  /** Sets the member's nickname; false when Discord refuses (server owner, or member ranked above the bot). */
  setNickname(discordId: string, nickname: string): Promise<boolean>;
  /** Gives the member this role, creating it if needed, and takes away the other roles of the group. */
  setOnlyRoleAmong(discordId: string, roleName: string, group: readonly string[]): Promise<void>;
  /** The Discord roles the member holds on the server, or undefined when they are no longer on it. */
  fetchRoleIds(discordId: string): Promise<string[] | undefined>;
  /** Gives the member this role, creating it if needed; and takes it away. */
  addRole(discordId: string, roleName: string): Promise<void>;
  removeRole(discordId: string, roleName: string): Promise<void>;
}

/** An event and its sign-ups, as shown in its Discord message. */
export interface AnnouncedRaid {
  event: RaidEvent;
  signups: Signup[];
}

/** The raid channel on Discord, where each event has a sign-up message. */
export interface RaidAnnouncer {
  /** Publishes the event's sign-up message and returns its id. */
  publish(raid: AnnouncedRaid): Promise<string>;
  /** Refreshes the message; false when it no longer exists (deleted on Discord). */
  update(messageId: string, raid: AnnouncedRaid): Promise<boolean>;
  /** Reminds the signed-up members of the raid, in the raid channel. */
  remind(reminder: RaidReminder): Promise<void>;
  /** Publishes the end-of-raid recap, in the raid channel. */
  recap(recap: RaidRecap): Promise<void>;
}

/** A bet and its stakes, as shown in its Discord message. */
export interface AnnouncedBet {
  bet: Bet;
  stakes: Stake[];
  /** Whether stakes are still taken. */
  open: boolean;
}

/** A channel on Discord where each item (a bet, a mission) has its message, refreshed as the item changes. */
export interface MessageAnnouncer<Item> {
  publish(item: Item): Promise<DiscordMessage>;
  /** Refreshes the message; false when it no longer exists (deleted on Discord). */
  update(message: DiscordMessage, item: Item): Promise<boolean>;
}

/** The bets' channel, where each bet has its message, with the pool and the odds. */
export type BetAnnouncer = MessageAnnouncer<AnnouncedBet>;

/** A mission and its scores, as shown in its Discord message. */
export interface AnnouncedMission {
  mission: Mission;
  status: MissionStatus;
  scores: MissionScore[];
}

/** The missions' channel, where each mission has its message, with its ranking. */
export type MissionAnnouncer = MessageAnnouncer<AnnouncedMission>;

/** The week's titles, as their Discord announcement shows them: each title and its holder, if any. */
export interface AnnouncedTitles {
  week: string;
  holders: readonly { title: string; rule: string; holder: string | undefined; score: number }[];
}

/** Where the bot announces each week's titles on Discord. */
export interface TitleAnnouncer {
  announce(titles: AnnouncedTitles): Promise<void>;
}

/** A deathroll for a big stake, as announced on Discord (P15.5). */
export interface AnnouncedDeathroll {
  id: string;
  winner: string;
  loser: string;
  stake: number;
  rolls: number;
}

export interface DeathrollAnnouncer {
  announce(game: AnnouncedDeathroll): Promise<void>;
}
