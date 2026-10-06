import { getApplication } from "@/server/application";
import { getConfig } from "@/server/config";
import { isCronRequest } from "@/server/cron";

/** Weekly task (vercel.json, Wednesday at reset): the titles go to the members ahead over the season (P13.2). */
export async function GET(request: Request): Promise<Response> {
  if (!isCronRequest(request, getConfig().cronSecret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json({ reassigned: await getApplication().titles.reassign() });
}
