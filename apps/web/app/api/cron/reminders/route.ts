import { getApplication } from "@/server/application";
import { getConfig } from "@/server/config";
import { isCronRequest } from "@/server/cron";

/** Daily task (vercel.json): reminds on Discord the raids of the next 24 hours. */
export async function GET(request: Request): Promise<Response> {
  if (!isCronRequest(request, getConfig().cronSecret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json({ reminded: await getApplication().raidReminders.sendDue(new Date()) });
}
