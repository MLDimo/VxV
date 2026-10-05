import { getApplication } from "@/server/application";
import { asCompanion } from "@/server/companionApi";

/** What the companion brings to the addon (VXV_Sync): the next event, for any member of the guild. */
export async function GET(request: Request): Promise<Response> {
  return asCompanion(request, async () => {
    const next = await getApplication().addonExport.exportNextEvent();
    return Response.json({
      raid: next === undefined ? null : { text: next.text, title: next.title, startsAt: next.startsAt.toISOString() },
    });
  });
}
