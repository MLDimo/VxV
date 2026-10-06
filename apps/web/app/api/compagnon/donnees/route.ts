import { getApplication } from "@/server/application";
import { asCompanion } from "@/server/companionApi";

/**
 * What the companion brings to the addon (VXV_Sync), for any member: the next event, then each bundle's data as
 * { text } under its name (the field of the inbox the bundle reads).
 */
export async function GET(request: Request): Promise<Response> {
  return asCompanion(request, async () => {
    const { addonExport, addonBets, addonMissions, addonTitles, addonArtisans } = getApplication();
    const next = await addonExport.exportNextEvent();
    return Response.json({
      raid: next === undefined ? null : { text: next.text, title: next.title, startsAt: next.startsAt.toISOString() },
      paris: { text: await addonBets.exportBets() },
      quetes: { text: await addonMissions.exportMissions() },
      titres: { text: await addonTitles.exportTitles() },
      artisans: { text: await addonArtisans.exportArtisans() },
    });
  });
}
