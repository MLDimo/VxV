import type { Bet, DiscordMessage, Stake } from "../domain/bets.ts";
import type { Duel, DuelStatus } from "../domain/duels.ts";
import type { ServerRole } from "../domain/eventRoles.ts";
import type { GuildEvent } from "../domain/events.ts";
import type { Mission, MissionScore, MissionStatus } from "../domain/missions.ts";
import type { RaidRecap } from "../domain/raidRecap.ts";
import type { RaidReminder, SoftReserveReminder } from "../domain/reminders.ts";
import type { Signup } from "../domain/signups.ts";

/** The application's ports to Discord, the bot's adapters: the guild's server and the channels it announces in. */

/** The guild's Discord server, as the bot acts on it. */
export interface GuildGateway {
  /** Sets the member's nickname; false when Discord refuses (server owner, or member ranked above the bot). */
  setNickname(discordId: string, nickname: string): Promise<boolean>;
  /**
   * Gives the member this role, created if needed and kept in its colour, and takes away the other roles of the
   * group.
   */
  setOnlyRoleAmong(discordId: string, role: { name: string; color: number }, group: readonly string[]): Promise<void>;
  /** The Discord roles the member holds on the server, or undefined when they are no longer on it. */
  fetchRoleIds(discordId: string): Promise<string[] | undefined>;
  /** The server's roles, @everyone included. */
  listRoles(): Promise<ServerRole[]>;
  /** Gives the member this role, creating it if needed; and takes it away. */
  addRole(discordId: string, roleName: string): Promise<void>;
  removeRole(discordId: string, roleName: string): Promise<void>;
}

/** An event and its sign-ups, as shown in its Discord message. */
export interface AnnouncedEvent {
  event: GuildEvent;
  signups: Signup[];
}

/** The raid channel on Discord, where each event has a sign-up message. */
export interface EventAnnouncer {
  /** Publishes the event's sign-up message and returns its id. */
  publish(raid: AnnouncedEvent): Promise<string>;
  /** Refreshes the message; false when it no longer exists (deleted on Discord). */
  update(messageId: string, raid: AnnouncedEvent): Promise<boolean>;
  /** Reminds the signed-up members of the raid, in the raid channel. */
  remind(reminder: RaidReminder): Promise<void>;
  /** Calls the signed-up members without soft reserves to choose them, in the raid channel. */
  remindSoftReserves(reminder: SoftReserveReminder): Promise<void>;
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

/** A duel as its Discord message shows it: its players, its time and place, where it stands, its bet. */
export interface AnnouncedDuel {
  duel: Duel;
  status: DuelStatus;
  challenger: string;
  opponent: string;
  /** The challenged member, called once in the message of a challenge. */
  opponentDiscordId: string;
  winner: string | undefined;
}

/** The PvP channel, where each duel has its message, refreshed as it goes. */
export type DuelAnnouncer = MessageAnnouncer<AnnouncedDuel>;

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
