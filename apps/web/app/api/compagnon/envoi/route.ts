import { z } from "zod";
import { getApplication } from "@/server/application";
import { asCompanion, errorResponse } from "@/server/companionApi";

const MS_PER_SECOND = 1000;
/** Far above a guild's roster or a raid's record: anything bigger is not VXV's. */
const MAX_TEXT = 200_000;
/** The addon keeps the last 20 raids. */
const MAX_RAID_LOGS = 20;
const MAX_CHARACTERS = 50;

/** What the companion read in the addon's saved data (apps/companion/src/domain/outbox.ts). */
const uploadSchema = z.object({
  roster: z.object({ text: z.string().max(MAX_TEXT), capturedAt: z.number().int().positive() }).optional(),
  raidLogs: z.array(z.string().max(MAX_TEXT)).max(MAX_RAID_LOGS).default([]),
  characters: z
    .array(z.object({ name: z.string().max(100), race: z.string().max(30), sex: z.number().int() }))
    .max(MAX_CHARACTERS)
    .default([]),
});

/** The companion sends what the addon saved for the website, after a /reload or a logout (P7.4). */
export async function POST(request: Request): Promise<Response> {
  return asCompanion(request, async (member) => {
    const upload = uploadSchema.safeParse(await request.json().catch(() => undefined));
    if (!upload.success) {
      return errorResponse("Envoi illisible : mets le compagnon à jour.");
    }
    const { roster, raidLogs, characters } = upload.data;
    const report = await getApplication().companionUploads.receive(member, {
      roster: roster && { text: roster.text, capturedAt: new Date(roster.capturedAt * MS_PER_SECOND) },
      raidLogs,
      characters,
    });
    return Response.json(report);
  });
}
