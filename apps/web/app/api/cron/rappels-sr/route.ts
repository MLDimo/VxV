import { getApplication } from "@/server/application";
import { databaseTask } from "@/server/cron";

/** Every 5 minutes, from the production database: an hour before a raid night, calls who has no soft reserve yet. */
export const GET = databaseTask(async () => ({
  reminded: await getApplication().raidReminders.sendSoftReservesDue(new Date()),
}));
