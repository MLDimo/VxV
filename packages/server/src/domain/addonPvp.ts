import { addonHead, flag, line, seconds, text, type AddonReaders } from "./addonText.ts";
import type { Duel, DuelStatus } from "./duels.ts";
import { eventAudience } from "./eventRoles.ts";
import type { GuildEvent } from "./events.ts";
import type { GameChangeOutcome } from "./gameChanges.ts";
import type { Signup } from "./signups.ts";

/** First line of the PvP data for the addon (contract with VXV_PvP); the number is the format version. */
export const ADDON_PVP_HEADER = "VXV-PVP-2";

/** The first of the Elo ranking the addon shows. */
export const ADDON_PVP_RANKED = 25;

export interface AddonPvpFacts extends AddonReaders {
  /** The PvP outings to come, with their sign-ups. */
  outings: readonly { event: GuildEvent; signups: readonly Signup[] }[];
  /** The duels to come, then the latest ended. */
  duels: readonly { duel: Duel; status: DuelStatus }[];
  /** The duelists, as the duels and the ranking name and draw them (their portrait, packages/design's avatars). */
  players: readonly {
    memberId: string;
    name: string;
    characterClass: string | undefined;
    avatar: string | undefined;
  }[];
  ranking: readonly { rank: number; memberId: string; rating: number; won: number; played: number }[];
  /** The duels' records. */
  records: readonly { label: string; value: string; memberId: string }[];
  /** What became of the changes made in game about the outings and the duels, in the order received. */
  changes: readonly GameChangeOutcome[];
}

/**
 * The PvP as the companion hands it to the addon, one record per line, after the head of every bundle's data
 * (addonHead: P, O and M):
 * E;event id;start (Unix seconds);title;who may sign up (eventAudience)
 * S;event id;character;class token;role;status;spec (the outing's sign-ups)
 * U;member id;name;class token, empty without main;portrait, empty without one (the duelists)
 * D;duel id;status;time (Unix seconds);place;challenger's member id;opponent's;winner's, empty without;bet id, empty
 *   without
 * R;rank;member id;Elo (rounded);duels won;duels played
 * K;label;value as written;member id (the duels' records)
 * C;change id;1 when done, 0 when refused;message
 */
export function formatAddonPvp(facts: AddonPvpFacts): string {
  return [
    ...addonHead(ADDON_PVP_HEADER, facts),
    ...facts.outings.flatMap(({ event, signups }) => [
      line("E", event.id, seconds(event.startsAt), text(event.title ?? ""), text(eventAudience(event.role))),
      ...signups.map((signup) =>
        line("S", event.id, signup.characterName, signup.characterClass, signup.role, signup.status, text(signup.spec)),
      ),
    ]),
    ...facts.players.map((player) =>
      line("U", player.memberId, text(player.name), player.characterClass ?? "", player.avatar ?? ""),
    ),
    ...facts.duels.map(({ duel, status }) =>
      line(
        "D",
        duel.id,
        status,
        seconds(duel.scheduledAt),
        text(duel.place),
        duel.challengerId,
        duel.opponentId,
        duel.winnerId ?? "",
        duel.betId ?? "",
      ),
    ),
    ...facts.ranking
      .slice(0, ADDON_PVP_RANKED)
      .map((entry) => line("R", entry.rank, entry.memberId, entry.rating, entry.won, entry.played)),
    ...facts.records.map((record) => line("K", text(record.label), text(record.value), record.memberId)),
    ...facts.changes.map((change) => line("C", change.id, flag(change.accepted), text(change.message))),
  ].join("\n");
}
