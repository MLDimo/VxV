import { getApplication } from "@/server/application";
import { asCompanion } from "@/server/companionApi";

/**
 * What the companion brings to the addon (VXV/Sync), for any member: the next event, then each bundle's data as
 * { text } under its name (the field of the inbox the bundle reads); for an officer, the roles an event may be
 * reserved to.
 */
export async function GET(request: Request): Promise<Response> {
  return asCompanion(request, async (member) => {
    const {
      addonExport,
      addonEventRoles,
      addonBets,
      addonMissions,
      addonTitles,
      addonArtisans,
      addonDeathrolls,
      addonRanking,
      addonPvp,
    } = getApplication();
    const next = await addonExport.exportNextEvent();
    const roles = await addonEventRoles.exportEventRoles(member);
    return Response.json({
      raid: next === undefined ? null : { text: next.text, title: next.title, startsAt: next.startsAt.toISOString() },
      paris: { text: await addonBets.exportBets() },
      quetes: { text: await addonMissions.exportMissions() },
      titres: { text: await addonTitles.exportTitles() },
      artisans: { text: await addonArtisans.exportArtisans() },
      deathroll: { text: await addonDeathrolls.exportDeathrolls() },
      ranking: { text: await addonRanking.exportRanking() },
      pvp: { text: await addonPvp.exportPvp() },
      raidroles: roles === undefined ? null : { text: roles },
    });
  });
}
