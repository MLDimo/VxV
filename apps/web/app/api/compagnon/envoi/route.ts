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

const changeBase = { id: z.string().min(1).max(160), eventId: z.string().max(60), author: z.string().max(100) };
/** A change made in game (addon/VXV_Raid/Changes.lua); one of a kind this website does not know is left aside. */
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
});

/** The companion sends what the addon saved for the website, after a /reload or a logout (P7.4). */
export async function POST(request: Request): Promise<Response> {
  return asCompanion(request, async (member) => {
    const upload = uploadSchema.safeParse(await request.json().catch(() => undefined));
    if (!upload.success) {
      return errorResponse("Envoi illisible : mets le compagnon à jour.");
    }
    const { roster, raidLogs, characters, changes } = upload.data;
    const report = await getApplication().companionUploads.receive(member, {
      roster: roster && { text: roster.text, capturedAt: new Date(roster.capturedAt * MS_PER_SECOND) },
      raidLogs,
      characters,
      changes: changes.flatMap((change) => {
        const parsed = changeSchema.safeParse(change);
        return parsed.success ? [parsed.data] : [];
      }),
    });
    return Response.json(report);
  });
}
