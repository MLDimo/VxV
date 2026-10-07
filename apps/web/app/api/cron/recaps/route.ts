import { getApplication } from "@/server/application";
import { cronTask } from "@/server/cron";

/** Daily task: publishes on Discord the recap of the raids over, from the companions' records. */
export const GET = cronTask(async () => ({ published: await getApplication().raidLogs.publishDueRecaps() }));
