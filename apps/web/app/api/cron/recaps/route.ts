import { getApplication } from "@/server/application";
import { getConfig } from "@/server/config";
import { isCronRequest } from "@/server/cron";

/** Daily task (vercel.json): publishes on Discord the recap of the raids over, from the companions' records. */
export async function GET(request: Request): Promise<Response> {
  if (!isCronRequest(request, getConfig().cronSecret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json({ published: await getApplication().raidLogs.publishDueRecaps() });
}
