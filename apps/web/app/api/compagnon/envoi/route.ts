import { MAX_BET_TITLE_LENGTH, MAX_CHOICE_LENGTH, MAX_CHOICES } from "@vxv/server/domain/bets";
import { MAX_DUEL_PLACE_LENGTH } from "@vxv/server/domain/duels";
import { MAX_EVENT_TITLE_LENGTH } from "@vxv/server/domain/events";
import { MAX_MISSION_DAYS, MAX_MISSION_TITLE_LENGTH } from "@vxv/server/domain/missions";
import { z } from "zod";
import { getApplication } from "@/server/application";
import { asCompanion, errorResponse } from "@/server/companionApi";

const MS_PER_SECOND = 1000;
/** Far above a guild's roster or a raid's record: anything bigger is not VXV's. */
const MAX_TEXT = 200_000;
/** The addon keeps the last 20 raids. */
const MAX_RAID_LOGS = 20;
const MAX_CHARACTERS = 50;
const MAX_CHANGES = 200;
const MAX_SOFT_RESERVES = 20;
/** Five counters for each character of an account, and the relays of an officer. */
const MAX_COUNTERS = 500;
/** Each bundle's texts (addon/VXV/Sync/Outbox.lua): a few kinds, a text per character or game. */
const MAX_TEXT_KINDS = 10;
const MAX_TEXTS = 200;
const MAX_KIND = 30;

const changeBase = {
  id: z.string().min(1).max(160),
  // A stake (VXV/Paris) is about a bet, not an event.
  eventId: z.string().max(60).default(""),
  author: z.string().max(100),
  // When the author made it in game (Unix seconds): the latest change wins.
  at: z.number().int().positive().optional(),
};
/**
 * A change made in game (the Changes.lua of VXV/Raid, VXV/Paris, VXV/PvP and VXV/Missions); one of a kind this
 * website does not know is left aside.
 */
const changeSchema = z.discriminatedUnion("kind", [
  z.object({
    ...changeBase,
    kind: z.literal("signup"),
    role: z.string().max(20),
    spec: z.string().max(100),
    status: z.string().max(20),
  }),
  z.object({
    ...changeBase,
    kind: z.literal("reserves"),
    itemIds: z.array(z.number().int().nonnegative()).max(MAX_SOFT_RESERVES),
  }),
  z.object({
    ...changeBase,
    kind: z.literal("exclusion"),
    itemId: z.number().int().nonnegative(),
    excluded: z.boolean(),
    reason: z.string().max(500),
  }),
  z.object({
    ...changeBase,
    kind: z.literal("event"),
    date: z.string().max(10),
    time: z.string().max(5),
    raidIds: z.array(z.string().max(60)).min(1).max(5),
    softReserves: z.number().int(),
    // A Discord id (snowflake), as the website listed it to the addon.
    roleId: z.string().max(30),
    reason: z.string().max(500),
  }),
  z.object({
    ...changeBase,
    kind: z.literal("stake"),
    betId: z.string().max(60),
    choiceId: z.string().max(60),
    amount: z.number(),
  }),
  z.object({ ...changeBase, kind: z.literal("withdraw"), betId: z.string().max(60) }),
  z.object({
    ...changeBase,
    kind: z.literal("pvpEvent"),
    title: z.string().max(MAX_EVENT_TITLE_LENGTH),
    date: z.string().max(10),
    time: z.string().max(5),
    roleId: z.string().max(30),
    reason: z.string().max(500),
  }),
  z.object({
    ...changeBase,
    kind: z.literal("duel"),
    opponentId: z.string().max(60),
    date: z.string().max(10),
    time: z.string().max(5),
    place: z.string().max(MAX_DUEL_PLACE_LENGTH),
  }),
  z.object({ ...changeBase, kind: z.literal("duelAnswer"), duelId: z.string().max(60), accept: z.boolean() }),
  z.object({ ...changeBase, kind: z.literal("duelConcede"), duelId: z.string().max(60) }),
  z.object({ ...changeBase, kind: z.literal("duelCancel"), duelId: z.string().max(60) }),
  z.object({
    ...changeBase,
    kind: z.literal("duelResult"),
    duelId: z.string().max(60),
    winner: z.string().max(100),
    loser: z.string().max(100),
  }),
  z.object({
    ...changeBase,
    kind: z.literal("mission"),
    type: z.string().max(30),
    // Empty: the type's title.
    title: z.string().max(MAX_MISSION_TITLE_LENGTH),
    reward: z.number(),
    days: z.number().int().min(1).max(MAX_MISSION_DAYS),
    reason: z.string().max(500),
  }),
  z.object({
    ...changeBase,
    kind: z.literal("bet"),
    title: z.string().max(MAX_BET_TITLE_LENGTH),
    choices: z.array(z.string().max(MAX_CHOICE_LENGTH)).max(MAX_CHOICES),
    date: z.string().max(10),
    time: z.string().max(5),
    reason: z.string().max(500),
  }),
]);

/** What the companion read in the addon's saved data (apps/companion/src/domain/outbox.ts). */
const uploadSchema = z.object({
  roster: z.object({ text: z.string().max(MAX_TEXT), capturedAt: z.number().int().positive() }).optional(),
  raidLogs: z.array(z.string().max(MAX_TEXT)).max(MAX_RAID_LOGS).default([]),
  characters: z
    .array(z.object({ name: z.string().max(100), race: z.string().max(30), sex: z.number().int() }))
    .max(MAX_CHARACTERS)
    .default([]),
  changes: z.array(z.unknown()).max(MAX_CHANGES).default([]),
  counters: z
    .array(
      z.object({
        name: z.string().max(100),
        type: z.string().max(30),
        value: z.number().int().nonnegative(),
        at: z.number().int().positive(),
      }),
    )
    .max(MAX_COUNTERS)
    .default([]),
  // Since the companion 1.3: each bundle's texts by kind, then by key.
  texts: z
    .record(z.string().max(MAX_KIND), z.record(z.string().max(MAX_KIND * 4), z.string().max(MAX_TEXT)))
    .refine((kinds) => Object.keys(kinds).length <= MAX_TEXT_KINDS)
    .refine((kinds) => Object.values(kinds).every((texts) => Object.keys(texts).length <= MAX_TEXTS))
    .default({}),
});

/** The companion sends what the addon saved for the website, after a /reload or a logout (P7.4). */
export async function POST(request: Request): Promise<Response> {
  return asCompanion(request, async (member) => {
    const upload = uploadSchema.safeParse(await request.json().catch(() => undefined));
    if (!upload.success) {
      return errorResponse("Envoi illisible : mets le compagnon à jour.");
    }
    const { roster, raidLogs, characters, changes, counters, texts } = upload.data;
    const report = await getApplication().companionUploads.receive(member, {
      roster: roster && { text: roster.text, capturedAt: new Date(roster.capturedAt * MS_PER_SECOND) },
      raidLogs,
      characters,
      changes: changes.flatMap((change) => {
        const parsed = changeSchema.safeParse(change);
        if (!parsed.success) {
          return [];
        }
        const { at, ...made } = parsed.data;
        return [{ ...made, madeAt: at === undefined ? undefined : new Date(at * MS_PER_SECOND) }];
      }),
      counters: counters.map((reading) => ({ ...reading, at: new Date(reading.at * MS_PER_SECOND) })),
      texts: Object.fromEntries(Object.entries(texts).map(([kind, byKey]) => [kind, Object.values(byKey)])),
    });
    return Response.json(report);
  });
}
