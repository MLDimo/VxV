import { getApplication } from "@/server/application";
import { asCompanion } from "@/server/companionApi";

/** What the companion brings to the addon (VXV_Sync): the next event and the bets, for any member of the guild. */
export async function GET(request: Request): Promise<Response> {
  return asCompanion(request, async () => {
    const { addonExport, addonBets } = getApplication();
    const next = await addonExport.exportNextEvent();
    return Response.json({
      raid: next === undefined ? null : { text: next.text, title: next.title, startsAt: next.startsAt.toISOString() },
      paris: { text: await addonBets.exportBets() },
    });
  });
}
