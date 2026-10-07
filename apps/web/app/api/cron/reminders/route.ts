import { getApplication } from "@/server/application";
import { cronTask } from "@/server/cron";

/** Daily task: reminds on Discord the raids of the next 24 hours. */
export const GET = cronTask(async () => ({ reminded: await getApplication().raidReminders.sendDue(new Date()) }));
